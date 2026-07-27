import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import JSZip from "jszip";
import {
  X, Copy, Check, Download, ChevronLeft, ChevronRight,
  Code2, Eye, Play, ExternalLink, FolderOpen, File, Folder,
  Archive, RefreshCw, History,
} from "lucide-react";
import { VersionHistoryModal } from "./VersionHistoryModal";

// ── Types ─────────────────────────────────────────────────────────────────────
export type ArtifactVersion = {
  code: string;
  lang: string;
  msgId: string;
  timestamp: number;
};

export type CodeArtifact = {
  id: string;
  title: string;
  versions: ArtifactVersion[];
  currentVersion: number; // index into versions[]
};

export type ProjectFile = {
  name: string;
  content: string;
  lang: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────
export function isPreviewable(lang: string): boolean {
  return ["html", "jsx", "tsx", "react"].includes(lang.toLowerCase());
}

function isProjectPreviewable(files: ProjectFile[]): boolean {
  return files.some(f =>
    ["html", "jsx", "tsx", "react", "js", "javascript"].some(ext =>
      f.lang.toLowerCase() === ext || f.name.endsWith("." + ext)
    )
  );
}

export function buildIframeDoc(code: string, lang: string): string {
  const l = lang.toLowerCase();
  if (l === "html") return code;
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>body{margin:0;padding:16px;background:#0a0a0a;color:#e5e7eb;font-family:sans-serif}</style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    const { useState, useEffect, useCallback, useRef, useMemo, createContext, useContext, Fragment } = React;
    ${code}
    try {
      const rootEl = document.getElementById('root');
      const Comp = typeof App !== 'undefined' ? App : null;
      if (Comp) ReactDOM.createRoot(rootEl).render(React.createElement(Comp));
    } catch(e) {
      document.getElementById('root').innerHTML = '<pre style="color:#f87171;white-space:pre-wrap">' + e.message + '</pre>';
    }
  </script>
</body>
</html>`;
}

// ── Build a combined preview document from all project files ──────────────────
export function buildProjectPreview(files: ProjectFile[]): string {
  const cssFiles = files.filter(f => f.name.endsWith(".css"));
  const jsFiles = files.filter(f =>
    [".jsx", ".tsx", ".js", ".ts"].some(e => f.name.endsWith(e))
  );
  const htmlFile = files.find(f => f.name.endsWith(".html"));

  const isReact = jsFiles.some(
    f => f.name.endsWith(".jsx") || f.name.endsWith(".tsx") ||
      f.content.includes("React") || f.content.includes("useState")
  );

  // ── Pure HTML/CSS/JS project ──────────────────────────────────────────────
  if (htmlFile && !isReact) {
    let html = htmlFile.content;
    const cssBlock = cssFiles.map(f => `<style>\n${f.content}\n</style>`).join("\n");
    const jsBlock = jsFiles.map(f => `<script>\n${f.content}\n<\/script>`).join("\n");
    if (html.includes("</head>")) html = html.replace("</head>", `${cssBlock}\n</head>`);
    else html = cssBlock + "\n" + html;
    if (html.includes("</body>")) html = html.replace("</body>", `${jsBlock}\n</body>`);
    else html = html + "\n" + jsBlock;
    return html;
  }

  // ── React multi-component project ─────────────────────────────────────────
  const cssContent = cssFiles.map(f => f.content).join("\n\n");

  // Process each JS/JSX file: remove imports (everything is in one scope),
  // transform exports so components are available globally.
  const processedCode = jsFiles.map(f => {
    let code = f.content;
    // Remove import statements
    code = code.replace(/^import\s+(?:type\s+)?(?:\*\s+as\s+\w+|\{[^}]*\}|\w+(?:\s*,\s*\{[^}]*\})?)\s+from\s+['"][^'"]*['"]\s*;?\s*$/gm, "");
    code = code.replace(/^import\s+['"][^'"]*['"]\s*;?\s*$/gm, "");
    // Track the last default export so we can mount it
    code = code.replace(/^export\s+default\s+function\s+(\w+)/gm, "function $1");
    code = code.replace(/^export\s+default\s+class\s+(\w+)/gm, "class $1");
    code = code.replace(/^export\s+default\s+/gm, "var __lastDefault = ");
    // Named exports → just definitions (they're accessible in the shared scope)
    code = code.replace(/^export\s+(function\s+)/gm, "$1");
    code = code.replace(/^export\s+(class\s+)/gm, "$1");
    code = code.replace(/^export\s+(const\s+|let\s+|var\s+)/gm, "$1");
    code = code.replace(/^export\s*\{[^}]*\}\s*;?\s*$/gm, "");
    return `// ── ${f.name} ──\n${code}`;
  }).join("\n\n");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    body { margin: 0; padding: 16px; background: #0a0a0a; color: #e5e7eb; font-family: sans-serif; }
    * { box-sizing: border-box; }
    ${cssContent}
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    const { useState, useEffect, useCallback, useRef, useMemo, createContext, useContext, Fragment } = React;

    ${processedCode}

    // Mount: try App, then last default export
    try {
      const root = document.getElementById('root');
      const Comp = typeof App !== 'undefined' ? App
        : typeof __lastDefault !== 'undefined' ? __lastDefault
        : null;
      if (Comp) {
        ReactDOM.createRoot(root).render(React.createElement(Comp));
      } else {
        root.innerHTML = '<p style="color:#fbbf24;font-family:monospace">⚠ لم يتم العثور على مكوّن App أو default export — تأكد أن أحد الملفات يصدّر مكوناً باسم App أو default</p>';
      }
    } catch(err) {
      document.getElementById('root').innerHTML =
        '<pre style="color:#f87171;white-space:pre-wrap;font-size:13px;padding:12px;background:#1a0000;border-radius:8px">خطأ في التجميع:\n' + err.message + '</pre>';
    }
  <\/script>
</body>
</html>`;
}

// ── Download all project files as a ZIP ───────────────────────────────────────
export async function downloadProjectZip(projectId: string, files: ProjectFile[]): Promise<void> {
  const zip = new JSZip();
  const folder = zip.folder(projectId) ?? zip;
  for (const f of files) {
    folder.file(f.name, f.content);
  }
  const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${projectId}-project.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Explicit create_artifact tool blocks ──────────────────────────────────────
const ARTIFACT_CARD_RE = /::ARTIFACT_CARD::(\{[\s\S]*?\})::\n```[^\n]*\n([\s\S]*?)```\n::\/ARTIFACT_CARD::/g;

export interface ArtifactCardBlock {
  raw: string;
  title: string;
  lang: string;
  code: string;
  // Multi-file project fields (present when isProject === true)
  projectId?: string;
  isProject?: boolean;
  projectFiles?: ProjectFile[];
}

export function extractArtifactCardBlocks(content: string): ArtifactCardBlock[] {
  const blocks: ArtifactCardBlock[] = [];
  const re = new RegExp(ARTIFACT_CARD_RE.source, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    try {
      const meta = JSON.parse(m[1]) as {
        title?: string; lang?: string;
        projectId?: string; isProject?: boolean; projectFiles?: ProjectFile[];
      };
      blocks.push({
        raw: m[0],
        title: meta.title?.trim() || "Untitled Artifact",
        lang: (meta.lang || "html").toLowerCase(),
        code: m[2].trim(),
        projectId: meta.projectId,
        isProject: meta.isProject,
        projectFiles: meta.projectFiles,
      });
    } catch {
      /* ignore malformed marker */
    }
  }
  return blocks;
}

export function stripArtifactCardBlocks(content: string): string {
  return content.replace(new RegExp(ARTIFACT_CARD_RE.source, "g"), "").trim();
}

// ── Clickable Artifact card shown inline in the chat bubble ───────────────────
export function ArtifactCard({
  title, lang, onOpen,
}: { title: string; lang: string; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="group flex items-center gap-3 w-full max-w-sm rounded-xl border px-3 py-2.5 my-1.5 text-left transition-transform hover:scale-[1.015] active:scale-[0.99]"
      style={{
        background: "linear-gradient(135deg, rgba(0,229,255,0.07), rgba(4,6,16,0.5))",
        borderColor: "rgba(0,229,255,0.25)",
      }}
    >
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: "rgba(0,229,255,0.12)", border: "1px solid rgba(0,229,255,0.3)" }}
      >
        <Code2 className="w-4 h-4" style={{ color: "#00e5ff" }} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-semibold text-white/90 truncate">{title}</div>
        <div className="text-[10.5px] text-white/40 font-mono uppercase tracking-wide">
          Code · {lang}
        </div>
      </div>
      <div
        className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center opacity-70 group-hover:opacity-100 transition-opacity"
        style={{ background: "rgba(0,229,255,0.15)" }}
        title="فتح المعاينة"
      >
        <Eye className="w-3.5 h-3.5" style={{ color: "#00e5ff" }} />
      </div>
    </button>
  );
}

// ── Clickable Project card — groups all files under one project ───────────────
export function ProjectCard({
  title, fileCount, onOpen,
}: { title: string; fileCount: number; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="group flex items-center gap-3 w-full max-w-sm rounded-xl border px-3 py-2.5 my-1.5 text-left transition-transform hover:scale-[1.015] active:scale-[0.99]"
      style={{
        background: "linear-gradient(135deg, rgba(139,92,246,0.1), rgba(4,6,16,0.6))",
        borderColor: "rgba(139,92,246,0.35)",
      }}
    >
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.35)" }}
      >
        <FolderOpen className="w-4 h-4" style={{ color: "#a78bfa" }} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-semibold text-white/90 truncate">{title}</div>
        <div className="text-[10.5px] font-mono uppercase tracking-wide" style={{ color: "#a78bfa80" }}>
          مشروع · {fileCount} {fileCount === 1 ? "ملف" : "ملفات"}
        </div>
      </div>
      <div
        className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center opacity-70 group-hover:opacity-100 transition-opacity"
        style={{ background: "rgba(139,92,246,0.2)" }}
        title="فتح المشروع"
      >
        <Eye className="w-3.5 h-3.5" style={{ color: "#a78bfa" }} />
      </div>
    </button>
  );
}

// ── Mobile breakpoint hook ────────────────────────────────────────────────────
function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(max-width: 767px)").matches;
  });

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return isMobile;
}

// ── Syntax highlighter (same tokeniser as CodeBlock) ─────────────────────────
function SyntaxCode({ code, lang }: { code: string; lang: string }) {
  const KEYWORDS: Record<string, string[]> = {
    python: ["def","class","import","from","as","return","if","elif","else","for","while","in","not","and","or","is","None","True","False","try","except","finally","raise","with","lambda","yield","async","await","pass","break","continue","global","nonlocal","del","assert"],
    javascript: ["const","let","var","function","return","if","else","for","while","do","switch","case","break","continue","new","class","extends","super","this","import","from","export","default","async","await","try","catch","finally","throw","typeof","instanceof","in","of","delete","void","yield","null","undefined","true","false"],
    typescript: ["const","let","var","function","return","if","else","for","while","do","switch","case","break","continue","new","class","extends","super","this","import","from","export","default","async","await","try","catch","finally","throw","typeof","instanceof","in","of","delete","void","yield","null","undefined","true","false","interface","type","enum","public","private","protected","readonly","static","abstract","implements","keyof","as","is","never","unknown","any","string","number","boolean"],
    bash: ["if","then","else","elif","fi","for","do","done","while","case","esac","function","return","echo","export","local","read","exit","cd","ls","sudo","chmod","chown","mkdir","rm","cp","mv","grep","sed","awk","cat"],
    sql: ["SELECT","FROM","WHERE","INSERT","UPDATE","DELETE","INTO","VALUES","SET","JOIN","LEFT","RIGHT","INNER","OUTER","ON","AS","GROUP","BY","ORDER","HAVING","LIMIT","OFFSET","CREATE","TABLE","DROP","ALTER","INDEX","UNIQUE","PRIMARY","KEY","FOREIGN","REFERENCES","CASCADE","NULL","NOT","AND","OR","IN","LIKE","BETWEEN","IS","CASE","WHEN","THEN","ELSE","END","UNION","DISTINCT","WITH"],
    rust: ["fn","let","mut","const","static","if","else","for","while","loop","match","break","continue","return","struct","enum","trait","impl","pub","use","mod","crate","self","Self","super","as","where","ref","move","async","await","dyn","unsafe","extern"],
    go: ["func","var","const","type","struct","interface","import","package","return","if","else","for","switch","case","default","break","continue","go","defer","chan","map","range","select","fallthrough","goto"],
  };
  const ALIASES: Record<string, string> = {
    py: "python", js: "javascript", jsx: "javascript", ts: "typescript", tsx: "typescript",
    sh: "bash", shell: "bash", zsh: "bash", rs: "rust", react: "javascript",
  };
  const resolved = ALIASES[lang.toLowerCase()] ?? lang.toLowerCase();
  const keywords = KEYWORDS[resolved] ?? [];
  const isSql = resolved === "sql";
  const tokens: { t: string; c: string }[] = [];
  const re = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/|#[^\n]*|--[^\n]*)|(`(?:\\`|[\s\S])*?`|"(?:\\"|[^"\n])*"|'(?:\\'|[^'\n])*')|(\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b)|([A-Za-z_$][A-Za-z0-9_$]*)(\s*\()?|(\s+)|([^\sA-Za-z0-9_$]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code)) !== null) {
    if (m[1] !== undefined) tokens.push({ t: m[1], c: "text-zinc-500 italic" });
    else if (m[2] !== undefined) tokens.push({ t: m[2], c: "text-emerald-400" });
    else if (m[3] !== undefined) tokens.push({ t: m[3], c: "text-cyan-300" });
    else if (m[4] !== undefined) {
      const id = m[4], kw = isSql ? id.toUpperCase() : id;
      if (keywords.includes(kw)) tokens.push({ t: id, c: "text-rose-400 font-semibold" });
      else if (m[5]) { tokens.push({ t: id, c: "text-amber-300" }); tokens.push({ t: m[5], c: "text-foreground/80" }); }
      else if (["true","false","null","None","True","False"].includes(id)) tokens.push({ t: id, c: "text-cyan-300" });
      else tokens.push({ t: id, c: "text-foreground/90" });
      continue;
    } else if (m[6] !== undefined) tokens.push({ t: m[6], c: "" });
    else if (m[7] !== undefined) tokens.push({ t: m[7], c: "text-violet-300" });
  }
  return (
    <pre className="p-4 text-[12.5px] leading-relaxed overflow-x-auto font-mono text-foreground/90 h-full">
      <code>{tokens.map((tk, i) => <span key={i} className={tk.c}>{tk.t}</span>)}</code>
    </pre>
  );
}

// ── File icon by extension ────────────────────────────────────────────────────
function FileIcon({ name }: { name: string }) {
  const ext = name.split(".").pop()?.toLowerCase();
  const colorMap: Record<string, string> = {
    jsx: "#61dafb", tsx: "#61dafb", js: "#f7df1e", ts: "#3178c6",
    html: "#e34f26", css: "#1572b6", json: "#fac863", py: "#3572a5",
    md: "#a0a0a0", sh: "#4eaa25", sql: "#e38c00", rs: "#ce422b", go: "#00add8",
  };
  const color = colorMap[ext ?? ""] ?? "#888";
  return <File className="w-3.5 h-3.5 flex-shrink-0" style={{ color }} />;
}

// ── ProjectPanel — the main project viewer panel ──────────────────────────────
interface ProjectPanelProps {
  files: ProjectFile[];
  projectId: string;
  onClose: () => void;
}

export function ProjectPanel({ files, projectId, onClose }: ProjectPanelProps) {
  const isMobile = useIsMobile();
  const [selectedFile, setSelectedFile] = useState<string>(files[0]?.name ?? "");
  const [tab, setTab] = useState<"code" | "preview">("code");
  const [reloadKey, setReloadKey] = useState(0);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [restoredOverride, setRestoredOverride] = useState<Record<string, string>>({});
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const baseCurrentFile = files.find(f => f.name === selectedFile) ?? files[0];
  const currentFile = baseCurrentFile && restoredOverride[baseCurrentFile.name] !== undefined
    ? { ...baseCurrentFile, content: restoredOverride[baseCurrentFile.name] }
    : baseCurrentFile;
  const canPreview = isProjectPreviewable(files);

  const rerun = useCallback(() => setReloadKey(k => k + 1), []);

  const copyCode = useCallback(() => {
    if (!currentFile) return;
    navigator.clipboard.writeText(currentFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [currentFile]);

  const downloadSingleFile = useCallback(() => {
    if (!currentFile) return;
    const blob = new Blob([currentFile.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = currentFile.name;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  }, [currentFile]);

  const downloadZip = useCallback(async () => {
    setDownloading(true);
    try {
      await downloadProjectZip(projectId, files);
    } finally {
      setDownloading(false);
    }
  }, [projectId, files]);

  const previewDoc = canPreview ? buildProjectPreview(files) : null;

  // Group files by folder (simple: files with "/" in name)
  const fileTree = files; // flat list — folders can be added later

  const mobileMotion = {
    initial: { y: "100%", opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit:    { y: "100%", opacity: 0 },
  };
  const desktopMotion = {
    initial: { width: 0, opacity: 0 },
    animate: { width: "52%", opacity: 1 },
    exit:    { width: 0, opacity: 0 },
  };

  return (
    <motion.div
      {...(isMobile ? mobileMotion : desktopMotion)}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={
        isMobile
          ? "flex flex-col overflow-hidden"
          : "flex flex-col h-full border-l overflow-hidden flex-shrink-0"
      }
      style={
        isMobile
          ? {
              position: "fixed",
              inset: 0,
              zIndex: 70,
              background: "linear-gradient(180deg, rgba(6,8,20,0.99) 0%, rgba(4,6,16,0.99) 100%)",
              boxShadow: "0 -4px 32px rgba(0,0,0,0.7)",
            }
          : {
              background: "linear-gradient(180deg, rgba(6,8,20,0.99) 0%, rgba(4,6,16,0.99) 100%)",
              borderColor: "rgba(139,92,246,0.2)",
              boxShadow: "-4px 0 24px rgba(0,0,0,0.5)",
              minWidth: 0,
            }
      }
    >
      {/* ── Header ── */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b flex-shrink-0"
        style={{ background: "rgba(0,0,0,0.4)", borderColor: "rgba(255,255,255,0.06)" }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#e21227" }} />
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#f59e0b" }} />
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#22c55e" }} />
          <FolderOpen className="w-3.5 h-3.5 ml-1 flex-shrink-0" style={{ color: "#a78bfa" }} />
          <span className="font-mono text-[11px] text-white/60 truncate">
            {projectId === "default" ? "المشروع" : projectId}
          </span>
          <span
            className="text-[9px] font-mono px-1.5 py-0.5 rounded-md flex-shrink-0"
            style={{ background: "rgba(139,92,246,0.15)", color: "#a78bfa", border: "1px solid rgba(139,92,246,0.3)" }}
          >
            {files.length} ملفات
          </span>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Version History */}
          {currentFile && (
            <button
              onClick={() => setShowHistory(true)}
              className="h-6 px-2 rounded flex items-center gap-1 text-[10px] hover:bg-white/10 transition-colors"
              style={{ color: "#60a5fa" }}
              title="سجل النسخ"
            >
              <History className="w-3 h-3" />
              النسخ
            </button>
          )}

          {/* Download ZIP */}
          <button
            onClick={downloadZip}
            disabled={downloading}
            className="h-6 px-2 rounded flex items-center gap-1 text-[10px] hover:bg-white/10 transition-colors disabled:opacity-50"
            style={{ color: "#a78bfa" }}
            title="تحميل المشروع كملف ZIP"
          >
            <Archive className="w-3 h-3" />
            {downloading ? "..." : "ZIP"}
          </button>

          {/* Re-run preview */}
          {canPreview && (
            <button
              onClick={rerun}
              className="h-6 px-2 rounded flex items-center gap-1 text-[10px] hover:bg-white/10 transition-colors"
              style={{ color: "#22c55e" }}
              title="إعادة تشغيل المعاينة"
            >
              <RefreshCw className="w-3 h-3" />
              تشغيل
            </button>
          )}

          {/* Copy current file */}
          <button
            onClick={copyCode}
            className="h-6 px-2 rounded flex items-center gap-1 text-[10px] hover:bg-white/10 transition-colors"
            style={{ color: copied ? "#22c55e" : "rgba(255,255,255,0.5)" }}
            title="نسخ الملف الحالي"
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copied ? "تم" : "نسخ"}
          </button>

          {/* Download current file */}
          <button
            onClick={downloadSingleFile}
            className="h-6 px-2 rounded flex items-center gap-1 text-[10px] hover:bg-white/10 transition-colors"
            style={{ color: "rgba(255,255,255,0.5)" }}
            title="تحميل الملف الحالي"
          >
            <Download className="w-3 h-3" />
            ملف
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            className="h-6 w-6 rounded flex items-center justify-center hover:bg-red-500/20 hover:text-red-400 transition-colors ml-1"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Tab Bar ── */}
      <div
        className="flex items-center gap-0 border-b flex-shrink-0"
        style={{ background: "rgba(0,0,0,0.25)", borderColor: "rgba(255,255,255,0.05)" }}
      >
        <button
          onClick={() => setTab("code")}
          className={`flex items-center gap-1.5 px-4 py-2 text-[11px] font-medium transition-all border-b-2 ${
            tab === "code" ? "text-violet-400 border-violet-400" : "text-white/40 border-transparent hover:text-white/70"
          }`}
        >
          <Code2 className="w-3 h-3" />
          كود
        </button>
        {canPreview && (
          <button
            onClick={() => setTab("preview")}
            className={`flex items-center gap-1.5 px-4 py-2 text-[11px] font-medium transition-all border-b-2 ${
              tab === "preview" ? "text-emerald-400 border-emerald-400" : "text-white/40 border-transparent hover:text-white/70"
            }`}
          >
            <Eye className="w-3 h-3" />
            معاينة مجمّعة
          </button>
        )}
        <div className="flex-1" />
        <span className="px-3 text-[9.5px] font-mono uppercase tracking-wider text-white/20">
          {currentFile?.lang}
        </span>
      </div>

      {/* ── Body: File Tree + Content ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* File Tree Sidebar */}
        <div
          className="flex flex-col border-r overflow-y-auto flex-shrink-0"
          style={{
            width: 160,
            background: "rgba(0,0,0,0.3)",
            borderColor: "rgba(255,255,255,0.05)",
          }}
        >
          <div
            className="px-2 py-1.5 text-[9px] font-mono uppercase tracking-widest flex-shrink-0 flex items-center gap-1"
            style={{ color: "rgba(255,255,255,0.25)" }}
          >
            <Folder className="w-3 h-3" />
            الملفات
          </div>
          {fileTree.map(f => (
            <button
              key={f.name}
              onClick={() => { setSelectedFile(f.name); setTab("code"); }}
              className="flex items-center gap-1.5 px-2 py-1.5 text-left text-[11px] truncate transition-colors hover:bg-white/5 flex-shrink-0 w-full"
              style={{
                color: selectedFile === f.name ? "#a78bfa" : "rgba(255,255,255,0.6)",
                background: selectedFile === f.name ? "rgba(139,92,246,0.1)" : undefined,
                borderLeft: selectedFile === f.name ? "2px solid #a78bfa" : "2px solid transparent",
              }}
              title={f.name}
            >
              <FileIcon name={f.name} />
              <span className="truncate font-mono">{f.name}</span>
            </button>
          ))}
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden relative">
          {tab === "code" ? (
            currentFile ? (
              <div className="h-full overflow-y-auto">
                <SyntaxCode code={currentFile.content} lang={currentFile.lang} />
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-white/20 text-sm font-mono">
                اختر ملفاً من الشجرة
              </div>
            )
          ) : (
            previewDoc ? (
              <iframe
                ref={iframeRef}
                key={`proj-preview-${reloadKey}`}
                srcDoc={previewDoc}
                sandbox="allow-scripts"
                className="w-full h-full border-0"
                style={{ background: "#fff" }}
                title="Project Preview"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-white/20 text-sm font-mono">
                لا توجد ملفات قابلة للمعاينة
              </div>
            )
          )}
        </div>
      </div>

      <AnimatePresence>
        {showHistory && currentFile && (
          <VersionHistoryModal
            projectId={projectId}
            filename={currentFile.name}
            onClose={() => setShowHistory(false)}
            onRestored={(content) => {
              setRestoredOverride((prev) => ({ ...prev, [currentFile.name]: content }));
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Main ArtifactPanel Component (single-file) ────────────────────────────────
interface ArtifactPanelProps {
  artifact: CodeArtifact | null;
  onClose: () => void;
  onVersionChange: (artifactId: string, versionIndex: number) => void;
}

export function ArtifactPanel({ artifact, onClose, onVersionChange }: ArtifactPanelProps) {
  const isMobile = useIsMobile();
  const [tab, setTab] = useState<"code" | "preview">("code");
  const [copied, setCopied] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const version = artifact?.versions[artifact.currentVersion] ?? null;
  const lang = version?.lang ?? "text";
  const code = version?.code ?? "";
  const canPreview = isPreviewable(lang);

  const rerun = useCallback(() => setReloadKey(k => k + 1), []);

  const openInNewTab = useCallback(() => {
    const b64 = btoa(unescape(encodeURIComponent(code)));
    const params = new URLSearchParams({ code: b64, lang });
    window.open(`/artifact-preview?${params.toString()}`, "_blank", "noopener,noreferrer");
  }, [code, lang]);

  // Switch to preview tab when language is previewable
  useEffect(() => {
    if (canPreview) setTab("preview");
    else setTab("code");
  }, [canPreview, artifact?.id]);

  const copyCode = useCallback(() => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [code]);

  const downloadFile = useCallback(() => {
    const extMap: Record<string, string> = {
      html: "html", javascript: "js", js: "js", typescript: "ts", ts: "ts",
      jsx: "jsx", tsx: "tsx", python: "py", py: "py", bash: "sh", sh: "sh",
      css: "css", sql: "sql", json: "json", rust: "rs", go: "go",
    };
    const ext = extMap[lang.toLowerCase()] ?? "txt";
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `artifact.${ext}`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  }, [code, lang]);

  const totalVersions = artifact?.versions.length ?? 0;
  const currentVersion = artifact?.currentVersion ?? 0;

  const apMobileMotion = {
    initial: { y: "100%", opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit:    { y: "100%", opacity: 0 },
  };
  const apDesktopMotion = {
    initial: { width: 0, opacity: 0 },
    animate: { width: "48%", opacity: 1 },
    exit:    { width: 0, opacity: 0 },
  };

  return (
    <motion.div
      {...(isMobile ? apMobileMotion : apDesktopMotion)}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={
        isMobile
          ? "flex flex-col overflow-hidden"
          : "flex flex-col h-full border-l overflow-hidden flex-shrink-0"
      }
      style={
        isMobile
          ? {
              position: "fixed",
              inset: 0,
              zIndex: 70,
              background: "linear-gradient(180deg, rgba(6,8,20,0.99) 0%, rgba(4,6,16,0.99) 100%)",
              boxShadow: "0 -4px 32px rgba(0,0,0,0.7)",
            }
          : {
              background: "linear-gradient(180deg, rgba(6,8,20,0.99) 0%, rgba(4,6,16,0.99) 100%)",
              borderColor: "rgba(0,229,255,0.15)",
              boxShadow: "-4px 0 24px rgba(0,0,0,0.5)",
              minWidth: 0,
            }
      }
    >
      {/* ── Header ── */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b flex-shrink-0"
        style={{ background: "rgba(0,0,0,0.4)", borderColor: "rgba(255,255,255,0.06)" }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: "#e21227" }} />
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: "#f59e0b" }} />
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: "#22c55e" }} />
          <span className="ml-1 font-mono text-[11px] text-white/50 truncate">
            {artifact?.title ?? "Artifact"}
          </span>
          {totalVersions > 1 && (
            <span
              className="text-[9px] font-mono px-1.5 py-0.5 rounded-md flex-shrink-0"
              style={{ background: "rgba(0,229,255,0.1)", color: "#00e5ff", border: "1px solid rgba(0,229,255,0.2)" }}
            >
              v{currentVersion + 1}/{totalVersions}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {totalVersions > 1 && artifact && (
            <>
              <button
                onClick={() => onVersionChange(artifact.id, Math.max(0, currentVersion - 1))}
                disabled={currentVersion === 0}
                className="h-6 w-6 rounded flex items-center justify-center disabled:opacity-30 hover:bg-white/10 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5 text-white/60" />
              </button>
              <button
                onClick={() => onVersionChange(artifact.id, Math.min(totalVersions - 1, currentVersion + 1))}
                disabled={currentVersion === totalVersions - 1}
                className="h-6 w-6 rounded flex items-center justify-center disabled:opacity-30 hover:bg-white/10 transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5 text-white/60" />
              </button>
            </>
          )}
          {canPreview && (
            <button onClick={rerun} className="h-6 px-2 rounded flex items-center gap-1 text-[10px] hover:bg-white/10 transition-colors" style={{ color: "#22c55e" }}>
              <Play className="w-3 h-3 fill-current" /> تشغيل
            </button>
          )}
          {canPreview && (
            <button onClick={openInNewTab} className="h-6 px-2 rounded flex items-center gap-1 text-[10px] hover:bg-white/10 transition-colors" style={{ color: "rgba(255,255,255,0.5)" }}>
              <ExternalLink className="w-3 h-3" /> فتح
            </button>
          )}
          <button onClick={copyCode} className="h-6 px-2 rounded flex items-center gap-1 text-[10px] hover:bg-white/10 transition-colors" style={{ color: copied ? "#22c55e" : "rgba(255,255,255,0.5)" }}>
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copied ? "تم" : "نسخ"}
          </button>
          <button onClick={downloadFile} className="h-6 px-2 rounded flex items-center gap-1 text-[10px] hover:bg-white/10 transition-colors" style={{ color: "rgba(255,255,255,0.5)" }}>
            <Download className="w-3 h-3" /> تحميل
          </button>
          <button onClick={onClose} className="h-6 w-6 rounded flex items-center justify-center hover:bg-red-500/20 hover:text-red-400 transition-colors ml-1" style={{ color: "rgba(255,255,255,0.4)" }}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Tab Bar ── */}
      <div className="flex items-center gap-0 border-b flex-shrink-0" style={{ background: "rgba(0,0,0,0.25)", borderColor: "rgba(255,255,255,0.05)" }}>
        <button
          onClick={() => setTab("code")}
          className={`flex items-center gap-1.5 px-4 py-2 text-[11px] font-medium transition-all border-b-2 ${tab === "code" ? "text-cyan-400 border-cyan-400" : "text-white/40 border-transparent hover:text-white/70"}`}
        >
          <Code2 className="w-3 h-3" /> كود
        </button>
        {canPreview && (
          <button
            onClick={() => setTab("preview")}
            className={`flex items-center gap-1.5 px-4 py-2 text-[11px] font-medium transition-all border-b-2 ${tab === "preview" ? "text-emerald-400 border-emerald-400" : "text-white/40 border-transparent hover:text-white/70"}`}
          >
            <Eye className="w-3 h-3" /> معاينة
          </button>
        )}
        <div className="flex-1" />
        <span className="px-3 text-[9.5px] font-mono uppercase tracking-wider text-white/20">{lang}</span>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-hidden relative">
        {artifact ? (
          tab === "code" ? (
            <div className="h-full overflow-y-auto">
              <SyntaxCode code={code} lang={lang} />
            </div>
          ) : (
            <iframe
              ref={iframeRef}
              key={`${artifact.id}-${currentVersion}-${reloadKey}`}
              srcDoc={buildIframeDoc(code, lang)}
              sandbox="allow-scripts"
              className="w-full h-full border-0"
              style={{ background: "#fff" }}
              title="Artifact Preview"
            />
          )
        ) : (
          <div className="flex items-center justify-center h-full text-white/20 text-sm font-mono">
            لا يوجد artifact محدد
          </div>
        )}
      </div>

      {/* ── Footer (version dots) ── */}
      {totalVersions > 1 && (
        <div className="flex items-center justify-center gap-1 py-1.5 border-t flex-shrink-0" style={{ borderColor: "rgba(255,255,255,0.05)", background: "rgba(0,0,0,0.3)" }}>
          {artifact?.versions.map((_, i) => (
            <button
              key={i}
              onClick={() => artifact && onVersionChange(artifact.id, i)}
              className="rounded-full transition-all"
              style={{
                width: i === currentVersion ? 16 : 6,
                height: 6,
                background: i === currentVersion ? "#00e5ff" : "rgba(255,255,255,0.2)",
              }}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ── Utility: extract code artifacts from message content ─────────────────────
export function extractCodeArtifacts(content: string, msgId: string): ArtifactVersion[] {
  const artifacts: ArtifactVersion[] = [];
  const cleaned = stripArtifactCardBlocks(content);
  const re = /```(\w+)?\n?([\s\S]*?)```/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(cleaned)) !== null) {
    const lang = m[1] || "text";
    const code = m[2].trim();
    const lineCount = code.split("\n").length;
    if (lineCount >= 20) {
      artifacts.push({ code, lang, msgId, timestamp: Date.now() });
    }
  }
  return artifacts;
}
