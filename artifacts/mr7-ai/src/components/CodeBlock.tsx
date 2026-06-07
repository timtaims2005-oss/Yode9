import { useState, useMemo } from "react";
import { Check, Copy } from "lucide-react";

export function renderMessageContent(content: string) {
  const parts: { type: "text" | "code"; lang?: string; value: string }[] = [];
  const re = /```(\w+)?\n?([\s\S]*?)```/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    if (m.index > last) parts.push({ type: "text", value: content.slice(last, m.index) });
    parts.push({ type: "code", lang: m[1] || "text", value: m[2].trim() });
    last = m.index + m[0].length;
  }
  if (last < content.length) parts.push({ type: "text", value: content.slice(last) });
  if (parts.length === 0) parts.push({ type: "text", value: content });
  return parts;
}

const KEYWORDS: Record<string, string[]> = {
  python: ["def","class","import","from","as","return","if","elif","else","for","while","in","not","and","or","is","None","True","False","try","except","finally","raise","with","lambda","yield","async","await","pass","break","continue","global","nonlocal","del","assert"],
  javascript: ["const","let","var","function","return","if","else","for","while","do","switch","case","break","continue","new","class","extends","super","this","import","from","export","default","async","await","try","catch","finally","throw","typeof","instanceof","in","of","delete","void","yield","null","undefined","true","false"],
  typescript: ["const","let","var","function","return","if","else","for","while","do","switch","case","break","continue","new","class","extends","super","this","import","from","export","default","async","await","try","catch","finally","throw","typeof","instanceof","in","of","delete","void","yield","null","undefined","true","false","interface","type","enum","public","private","protected","readonly","static","abstract","implements","keyof","as","is","never","unknown","any","string","number","boolean"],
  bash: ["if","then","else","elif","fi","for","do","done","while","case","esac","function","return","echo","export","local","read","exit","cd","ls","sudo","chmod","chown","mkdir","rm","cp","mv","grep","sed","awk","cat"],
  rust: ["fn","let","mut","const","static","if","else","for","while","loop","match","break","continue","return","struct","enum","trait","impl","pub","use","mod","crate","self","Self","super","as","where","ref","move","async","await","dyn","unsafe","extern"],
  go: ["func","var","const","type","struct","interface","import","package","return","if","else","for","switch","case","default","break","continue","go","defer","chan","map","range","select","fallthrough","goto"],
  sql: ["SELECT","FROM","WHERE","INSERT","UPDATE","DELETE","INTO","VALUES","SET","JOIN","LEFT","RIGHT","INNER","OUTER","ON","AS","GROUP","BY","ORDER","HAVING","LIMIT","OFFSET","CREATE","TABLE","DROP","ALTER","INDEX","UNIQUE","PRIMARY","KEY","FOREIGN","REFERENCES","CASCADE","NULL","NOT","AND","OR","IN","LIKE","BETWEEN","IS","CASE","WHEN","THEN","ELSE","END","UNION","DISTINCT","WITH"],
};

const ALIASES: Record<string, string> = {
  py: "python", js: "javascript", jsx: "javascript", ts: "typescript", tsx: "typescript",
  sh: "bash", shell: "bash", zsh: "bash", rs: "rust",
};

type Tok = { t: string; c: string };

function highlight(code: string, langRaw: string): Tok[] {
  const lang = ALIASES[langRaw.toLowerCase()] ?? langRaw.toLowerCase();
  const keywords = KEYWORDS[lang] ?? [];
  const isSql = lang === "sql";
  const out: Tok[] = [];

  // Token regex order matters: comments → strings → numbers → keywords → functions → identifiers → punctuation
  const re = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/|#[^\n]*|--[^\n]*)|(`(?:\\`|[\s\S])*?`|"(?:\\"|[^"\n])*"|'(?:\\'|[^'\n])*')|(\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b)|([A-Za-z_$][A-Za-z0-9_$]*)(\s*\()?|(\s+)|([^\sA-Za-z0-9_$]+)/g;

  let m: RegExpExecArray | null;
  while ((m = re.exec(code)) !== null) {
    if (m[1] !== undefined) out.push({ t: m[1], c: "text-zinc-500 italic" });
    else if (m[2] !== undefined) out.push({ t: m[2], c: "text-emerald-400" });
    else if (m[3] !== undefined) out.push({ t: m[3], c: "text-cyan-300" });
    else if (m[4] !== undefined) {
      const id = m[4];
      const kw = isSql ? id.toUpperCase() : id;
      if (keywords.includes(kw)) {
        out.push({ t: id, c: "text-rose-400 font-semibold" });
      } else if (m[5]) {
        out.push({ t: id, c: "text-amber-300" });
        out.push({ t: m[5], c: "text-foreground/80" });
      } else if (id === "true" || id === "false" || id === "null" || id === "None" || id === "True" || id === "False") {
        out.push({ t: id, c: "text-cyan-300" });
      } else {
        out.push({ t: id, c: "text-foreground/90" });
      }
      continue;
    }
    else if (m[6] !== undefined) out.push({ t: m[6], c: "" });
    else if (m[7] !== undefined) out.push({ t: m[7], c: "text-violet-300" });
  }
  return out;
}

export function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const [copied, setCopied] = useState(false);
  const tokens = useMemo(() => highlight(code, lang), [code, lang]);

  return (
    <div className="my-3 rounded-xl overflow-hidden border border-border bg-[#0a0a0a]">
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#101010] border-b border-border text-[11px]">
        <span className="font-mono text-muted-foreground uppercase tracking-wider">{lang}</span>
        <button
          onClick={() => {
            navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="p-3 text-[12.5px] leading-relaxed overflow-x-auto font-mono text-foreground/90">
        <code>
          {tokens.map((tk, i) => (
            <span key={i} className={tk.c}>{tk.t}</span>
          ))}
        </code>
      </pre>
    </div>
  );
}
