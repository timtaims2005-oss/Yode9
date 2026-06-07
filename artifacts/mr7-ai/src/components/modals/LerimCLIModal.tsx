import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Terminal, GitMerge } from "lucide-react";
import { pipeline } from "@/lib/pipeline";

interface LerimCLIModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

type Line = { type: "input" | "output" | "error" | "system"; text: string };

const HELP_TEXT = `lerim-cli v2.0.0 — AI Terminal Interface

COMMANDS:
  /ask <question>     — Ask the AI anything
  /code <task>        — Generate code for a task
  /explain <code>     — Explain code snippet
  /fix <code>         — Debug and fix code
  /shell <task>       — Generate shell commands
  /scan <target>      — OSINT scan a target
  /pipe               — Push last output to pipeline
  /clear              — Clear terminal
  /help               — Show this help

SHORTCUTS:
  Enter               — Execute command
  ↑/↓ arrows          — Command history
  Ctrl+L              — Clear screen

Type any message to chat with AI directly.
`;

const SLASH_HANDLERS: Record<string, string> = {
  code:    "You are an expert programmer. Generate clean, working code for: ",
  explain: "You are a code explainer. Explain this code clearly, line by line if needed: ",
  fix:     "You are a debugging expert. Find and fix all bugs in this code. Explain what was wrong: ",
  shell:   "You are a shell scripting expert. Generate bash/shell commands to accomplish: ",
  scan:    "You are an OSINT analyst. Perform reconnaissance on this target. Give detailed findings: ",
  ask:     "",
};

export function LerimCLIModal({ open, onOpenChange }: LerimCLIModalProps) {
  const [lines, setLines] = useState<Line[]>([
    { type: "system", text: "lerim-cli v2.0.0 initialized. Type /help for commands." },
  ]);
  const [input, setInput] = useState("");
  const [running, setRunning] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const [lastOutput, setLastOutput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [lines]);
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 100); }, [open]);

  async function execute() {
    const cmd = input.trim();
    if (!cmd || running) return;
    setInput("");
    setHistory((prev) => [cmd, ...prev.slice(0, 49)]);
    setHistIdx(-1);
    setLines((prev) => [...prev, { type: "input", text: `$ ${cmd}` }]);

    if (cmd === "/clear" || cmd === "clear") { setLines([{ type: "system", text: "Terminal cleared." }]); return; }
    if (cmd === "/help" || cmd === "help") { setLines((prev) => [...prev, { type: "output", text: HELP_TEXT }]); return; }
    if (cmd === "/pipe") {
      if (lastOutput) {
        pipeline.push({ source: "LERIMCLI", sourceColor: "#818cf8", label: "CLI output", content: lastOutput });
        setLines((prev) => [...prev, { type: "system", text: "[Pipeline] Output pushed to pipeline." }]);
      } else {
        setLines((prev) => [...prev, { type: "error", text: "No output to pipe. Run a command first." }]);
      }
      return;
    }

    setRunning(true);
    const parts = cmd.match(/^\/(\w+)\s*([\s\S]*)/) ?? [null, null, cmd];
    const slashCmd = parts[1] as string | null;
    const arg = parts[2] as string;

    const systemPrefix = slashCmd && SLASH_HANDLERS[slashCmd] !== undefined
      ? SLASH_HANDLERS[slashCmd]
      : "";
    const userMsg = systemPrefix + (arg || (slashCmd ? cmd.slice(slashCmd.length + 2) : cmd));

    // streaming output line
    setLines((prev) => [...prev, { type: "output", text: "" }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "system", content: "You are LERIM — a terminal AI assistant. Give precise, direct responses. For code: use markdown code blocks. For explanations: be concise." },
            { role: "user", content: userMsg },
          ],
          model: "gpt-5.4",
          stream: true,
        }),
      });
      const reader = res.body?.getReader();
      const dec = new TextDecoder();
      let buf = "", full = "";
      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const ls = buf.split("\n");
        buf = ls.pop() ?? "";
        for (const line of ls) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6);
          if (raw === "[DONE]") continue;
          try {
            const chunk = JSON.parse(raw);
            const delta = chunk.choices?.[0]?.delta?.content ?? "";
            full += delta;
            setLines((prev) => prev.map((l, i) => i === prev.length - 1 ? { ...l, text: full } : l));
          } catch { /* ignore */ }
        }
      }
      setLastOutput(full);
    } catch {
      setLines((prev) => prev.map((l, i) => i === prev.length - 1 ? { ...l, type: "error", text: "Command execution failed." } : l));
    }
    setRunning(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") { execute(); return; }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const idx = Math.min(histIdx + 1, history.length - 1);
      setHistIdx(idx);
      setInput(history[idx] ?? "");
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const idx = Math.max(histIdx - 1, -1);
      setHistIdx(idx);
      setInput(idx === -1 ? "" : history[idx]);
    }
    if (e.ctrlKey && e.key === "l") { e.preventDefault(); setLines([{ type: "system", text: "Terminal cleared." }]); }
  }

  if (!open) return null;
  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4"
          style={{ backdropFilter: "blur(8px)", background: "rgba(0,0,0,0.92)" }}>
          <motion.div initial={{ opacity: 0, scale: 0.97, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: 10 }}
            className="w-full max-w-2xl max-h-[88vh] flex flex-col rounded-xl overflow-hidden"
            style={{ background: "#030303", border: "1px solid rgba(129,140,248,0.3)", boxShadow: "0 0 60px rgba(129,140,248,0.1), inset 0 1px 0 rgba(255,255,255,0.04)" }}>
            {/* Title bar */}
            <div className="flex items-center justify-between px-4 py-2 border-b" style={{ borderColor: "rgba(129,140,248,0.15)", background: "#060606" }}>
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  {["#e21227","#fbbf24","#10b981"].map((c) => <div key={c} className="w-3 h-3 rounded-full" style={{ background: c }} />)}
                </div>
                <div className="flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5" style={{ color: "#818cf8" }} />
                  <span className="text-[11px] font-mono font-bold" style={{ color: "#818cf8" }}>lerim-cli — AI Terminal</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {lastOutput && (
                  <button onClick={() => pipeline.push({ source: "LERIMCLI", sourceColor: "#818cf8", label: "CLI output", content: lastOutput })}
                    className="flex items-center gap-1 px-2 py-0.5 rounded text-[8px] font-bold border"
                    style={{ background: "rgba(0,229,204,0.06)", borderColor: "rgba(0,229,204,0.2)", color: "#00e5cc" }}>
                    <GitMerge className="w-2.5 h-2.5" /> Pipe
                  </button>
                )}
                <button onClick={() => onOpenChange(false)} className="p-1 text-gray-700 hover:text-white"><X className="w-3.5 h-3.5" /></button>
              </div>
            </div>

            {/* Terminal body */}
            <div className="flex-1 overflow-y-auto p-4 font-mono text-[11px] leading-relaxed" style={{ background: "#030303" }}
              onClick={() => inputRef.current?.focus()}>
              {lines.map((line, i) => (
                <div key={i} className="mb-0.5" style={{
                  color: line.type === "input" ? "#818cf8" : line.type === "error" ? "#e21227" : line.type === "system" ? "#2a4a40" : "#666",
                  whiteSpace: "pre-wrap", wordBreak: "break-word",
                }}>
                  {line.text}{running && i === lines.length - 1 && line.type === "output" ? <span className="animate-pulse">▊</span> : ""}
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Input line */}
            <div className="flex items-center gap-2 px-4 py-3 border-t font-mono" style={{ borderColor: "rgba(129,140,248,0.12)", background: "#060606" }}>
              <span style={{ color: "#818cf8" }}>$</span>
              <input ref={inputRef} type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={onKeyDown}
                disabled={running}
                className="flex-1 bg-transparent outline-none text-[11px]" style={{ color: "#ccc", caretColor: "#818cf8" }}
                placeholder="Type command or /help…" />
              {running && <span className="text-[9px] animate-pulse" style={{ color: "#818cf8" }}>running…</span>}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
