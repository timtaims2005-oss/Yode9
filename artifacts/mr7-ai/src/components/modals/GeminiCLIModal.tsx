import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Terminal, ChevronRight, Copy, CheckCheck, Trash2, GitMerge } from "lucide-react";
import { streamChat } from "@/lib/chat-client";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { pipeline } from "@/lib/pipeline";

interface GeminiCLIModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pipelineContext?: { text: string; key: number };
}

type Line =
  | { kind: "input"; text: string; ts: string }
  | { kind: "output"; text: string; ts: string }
  | { kind: "system"; text: string }
  | { kind: "error"; text: string };

const SLASH_COMMANDS: Record<string, string> = {
  "/help": "Show available slash commands",
  "/clear": "Clear the terminal output",
  "/model": "Show current active model",
  "/context": "Show last 4 messages from active chat",
  "/system": "Set a custom system prompt for this session",
  "/export": "Export terminal session as plain text",
  "/about": "Show Gemini CLI info",
};

const SYSTEM_PROMPT_DEFAULT = `You are Gemini CLI — a terminal-style AI assistant for cybersecurity, code, and system research. Respond concisely and technically. Format output as if it's terminal text: use plain formatting, no markdown headers (use --- separators instead), use code blocks only for actual code. Keep responses tight and informative.`;

const MOTD = [
  "  ██████╗ ███████╗███╗   ███╗██╗███╗   ██╗██╗     ██████╗██╗     ██╗",
  "  ██╔════╝ ██╔════╝████╗ ████║██║████╗  ██║██║    ██╔════╝██║     ██║",
  "  ██║  ███╗█████╗  ██╔████╔██║██║██╔██╗ ██║██║    ██║     ██║     ██║",
  "  ██║   ██║██╔══╝  ██║╚██╔╝██║██║██║╚██╗██║██║    ██║     ██║     ██║",
  "  ╚██████╔╝███████╗██║ ╚═╝ ██║██║██║ ╚████║██║    ╚██████╗███████╗██║",
  "   ╚═════╝ ╚══════╝╚═╝     ╚═╝╚═╝╚═╝  ╚═══╝╚═╝     ╚═════╝╚══════╝╚═╝",
  "",
  "  Terminal AI Interface v2.0 — powered by mr7.ai",
  "  Type /help for commands · Up/Down for history · Ctrl+L to clear",
  "  ─────────────────────────────────────────────────────────────────",
];

export function GeminiCLIModal({ open, onOpenChange, pipelineContext }: GeminiCLIModalProps) {
  const { state } = useStore();
  const { lang } = useT();
  const [lines, setLines] = useState<Line[]>(() =>
    MOTD.map((t) => ({ kind: "system" as const, text: t }))
  );
  const [input, setInput] = useState("");
  const [running, setRunning] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const [customSystem, setCustomSystem] = useState("");
  const [settingSystem, setSettingSystem] = useState(false);
  const [systemDraft, setSystemDraft] = useState("");
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const outputAccRef = useRef("");

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  useEffect(() => {
    if (!pipelineContext?.text) return;
    const preview = pipelineContext.text.slice(0, 200).replace(/\n/g, " ");
    addLine({ kind: "system", text: `  [Pipeline] Context injected: "${preview}${pipelineContext.text.length > 200 ? "…" : ""}"` });
    addLine({ kind: "system", text: "  Use this context in your next question." });
    setInput(`Based on this context: ${pipelineContext.text.slice(0, 300)}`);
    setTimeout(() => inputRef.current?.focus(), 100);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pipelineContext?.key]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines]);

  function addLine(line: Line) {
    setLines((p) => [...p, line]);
  }

  function ts() {
    return new Date().toLocaleTimeString("en-US", { hour12: false });
  }

  function handleSlashCommand(cmd: string): boolean {
    const parts = cmd.trim().split(/\s+/);
    const base = parts[0].toLowerCase();

    if (base === "/help") {
      addLine({ kind: "system", text: "" });
      addLine({ kind: "system", text: "  Available commands:" });
      Object.entries(SLASH_COMMANDS).forEach(([c, d]) => {
        addLine({ kind: "system", text: `  ${c.padEnd(14)} — ${d}` });
      });
      addLine({ kind: "system", text: "" });
      return true;
    }

    if (base === "/clear") {
      setLines(MOTD.map((t) => ({ kind: "system" as const, text: t })));
      return true;
    }

    if (base === "/model") {
      addLine({ kind: "system", text: `  Active model: ${state.activeModel}` });
      return true;
    }

    if (base === "/context") {
      const chat = state.chats.find((c) => c.id === state.activeChatId);
      const msgs = (chat?.messages ?? []).slice(-4);
      if (!msgs.length) {
        addLine({ kind: "system", text: "  No context messages found." });
      } else {
        addLine({ kind: "system", text: "" });
        msgs.forEach((m) => {
          addLine({ kind: "system", text: `  [${m.role.toUpperCase()}] ${m.content.slice(0, 120)}${m.content.length > 120 ? "…" : ""}` });
        });
        addLine({ kind: "system", text: "" });
      }
      return true;
    }

    if (base === "/system") {
      setSystemDraft(customSystem);
      setSettingSystem(true);
      return true;
    }

    if (base === "/export") {
      const text = lines.map((l) => {
        if (l.kind === "input") return `$ ${l.text}`;
        return l.text;
      }).join("\n");
      const blob = new Blob([text], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `gemini-cli-${Date.now()}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      addLine({ kind: "system", text: "  Session exported." });
      return true;
    }

    if (base === "/about") {
      addLine({ kind: "system", text: "" });
      addLine({ kind: "system", text: "  Gemini CLI — Terminal AI Interface" });
      addLine({ kind: "system", text: "  Source: Gemini CLI · Integrated by mr7.ai" });
      addLine({ kind: "system", text: "  AI Brain: main LLM via /api/chat SSE stream" });
      addLine({ kind: "system", text: "" });
      return true;
    }

    return false;
  }

  async function submit() {
    if (!input.trim() || running) return;
    const cmd = input.trim();
    setInput("");
    setHistIdx(-1);
    setHistory((p) => [cmd, ...p.slice(0, 49)]);
    addLine({ kind: "input", text: cmd, ts: ts() });

    if (cmd.startsWith("/")) {
      const handled = handleSlashCommand(cmd);
      if (!handled) {
        addLine({ kind: "error", text: `  Unknown command: ${cmd}. Type /help for available commands.` });
      }
      return;
    }

    setRunning(true);
    outputAccRef.current = "";
    const outputLineIdx = lines.length + 1;
    setLines((p) => [...p, { kind: "output" as const, text: "", ts: ts() }]);

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const contextMsgs = (() => {
      const chat = state.chats.find((c) => c.id === state.activeChatId);
      const history = (chat?.messages ?? [])
        .filter((m) => m.role === "user" || m.role === "assistant")
        .slice(-4)
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
      return [...history, { role: "user" as const, content: cmd }];
    })();

    try {
      await streamChat(
        {
          model: state.activeModel,
          persona: null,
          customInstructions: "",
          language: (lang as "en" | "ar") ?? "en",
          memory: [],
          messages: contextMsgs,
          customSystemPrompt: customSystem || SYSTEM_PROMPT_DEFAULT,
        },
        (chunk) => {
          outputAccRef.current += chunk;
          const text = outputAccRef.current;
          setLines((p) =>
            p.map((l, i) => (i === outputLineIdx ? { ...l, text } : l))
          );
        },
        ctrl.signal,
      );
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") {
        addLine({ kind: "error", text: `  Error: ${(e as Error)?.message ?? "Request failed"}` });
      }
    } finally {
      setRunning(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      submit();
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const next = Math.min(histIdx + 1, history.length - 1);
      setHistIdx(next);
      if (history[next]) setInput(history[next]);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = Math.max(histIdx - 1, -1);
      setHistIdx(next);
      setInput(next === -1 ? "" : history[next] ?? "");
      return;
    }
    if (e.ctrlKey && e.key === "l") {
      e.preventDefault();
      setLines(MOTD.map((t) => ({ kind: "system" as const, text: t })));
      return;
    }
    if (e.ctrlKey && e.key === "c") {
      e.preventDefault();
      abortRef.current?.abort();
      setRunning(false);
      addLine({ kind: "system", text: "^C" });
      return;
    }
  }

  function copySession() {
    const text = lines.map((l) => {
      if (l.kind === "input") return `$ ${l.text}`;
      return l.text;
    }).join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4"
          style={{ backdropFilter: "blur(8px)", background: "rgba(0,0,0,0.9)" }}
          onClick={(e) => { if (e.target === e.currentTarget) onOpenChange(false); }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-3xl max-h-[92vh] flex flex-col rounded-2xl overflow-hidden"
            style={{
              background: "#020206",
              border: "1px solid rgba(129,140,248,0.3)",
              boxShadow: "0 0 70px rgba(129,140,248,0.15), 0 0 140px rgba(129,140,248,0.05)",
            }}
          >
            {/* Title bar */}
            <div
              className="flex items-center justify-between px-4 py-2.5 border-b flex-shrink-0"
              style={{ borderColor: "rgba(129,140,248,0.15)", background: "#030308" }}
            >
              <div className="flex items-center gap-2.5">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ background: "#f87171" }} />
                  <div className="w-3 h-3 rounded-full" style={{ background: "#fbbf24" }} />
                  <div className="w-3 h-3 rounded-full" style={{ background: "#4ade80" }} />
                </div>
                <div className="flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5" style={{ color: "#818cf8" }} />
                  <span className="text-[11px] font-mono font-bold" style={{ color: "#818cf8" }}>
                    gemini-cli — bash
                  </span>
                  {running && (
                    <span
                      className="text-[9px] font-mono animate-pulse"
                      style={{ color: "#4ade80" }}
                    >
                      ● running
                    </span>
                  )}
                  {customSystem && (
                    <span className="text-[9px] font-mono" style={{ color: "#fbbf24" }}>
                      [custom prompt]
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={copySession}
                  className="p-1.5 rounded transition-colors"
                  style={{ color: "#333" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#818cf8")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#333")}
                  title="Copy session"
                >
                  {copied ? <CheckCheck className="w-3.5 h-3.5" style={{ color: "#4ade80" }} /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => setLines(MOTD.map((t) => ({ kind: "system" as const, text: t })))}
                  className="p-1.5 rounded transition-colors"
                  style={{ color: "#333" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#818cf8")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#333")}
                  title="Clear"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onOpenChange(false)}
                  className="p-1.5 rounded transition-colors"
                  style={{ color: "#333" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#f87171")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#333")}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* System prompt modal */}
            <AnimatePresence>
              {settingSystem && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden border-b flex-shrink-0"
                  style={{ borderColor: "rgba(129,140,248,0.2)", background: "rgba(129,140,248,0.04)" }}
                >
                  <div className="px-4 py-3 space-y-2">
                    <div className="text-[10px] font-mono" style={{ color: "#818cf8" }}>
                      Set custom system prompt (empty = default):
                    </div>
                    <textarea
                      value={systemDraft}
                      onChange={(e) => setSystemDraft(e.target.value)}
                      placeholder="You are a specialized AI for…"
                      rows={3}
                      className="w-full bg-transparent border rounded px-3 py-2 text-[11px] font-mono outline-none resize-none"
                      style={{ borderColor: "rgba(129,140,248,0.25)", color: "#ccc" }}
                      autoFocus
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => setSettingSystem(false)}
                        className="px-3 py-1 rounded text-[10px] font-mono border"
                        style={{ borderColor: "rgba(255,255,255,0.08)", color: "#555" }}
                      >
                        cancel
                      </button>
                      <button
                        onClick={() => {
                          setCustomSystem(systemDraft.trim());
                          setSettingSystem(false);
                          addLine({ kind: "system", text: `  System prompt ${systemDraft.trim() ? "updated" : "reset to default"}.` });
                        }}
                        className="px-3 py-1 rounded text-[10px] font-mono border"
                        style={{ background: "rgba(129,140,248,0.1)", borderColor: "rgba(129,140,248,0.35)", color: "#818cf8" }}
                      >
                        set
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Terminal output */}
            <div
              className="flex-1 overflow-y-auto px-4 py-3 font-mono text-[12px] leading-relaxed min-h-0"
              style={{ background: "#020206" }}
              onClick={() => inputRef.current?.focus()}
            >
              {lines.map((line, i) => {
                if (line.kind === "system") {
                  return (
                    <div key={i} style={{ color: "#818cf8", whiteSpace: "pre" }}>
                      {line.text}
                    </div>
                  );
                }
                if (line.kind === "input") {
                  return (
                    <div key={i} className="flex items-start gap-1.5 mt-2">
                      <span style={{ color: "#4ade80" }}>$</span>
                      <span style={{ color: "#e2e8f0" }}>{line.text}</span>
                      <span className="ml-auto text-[9px] opacity-30" style={{ color: "#818cf8" }}>{line.ts}</span>
                    </div>
                  );
                }
                if (line.kind === "error") {
                  return (
                    <div key={i} style={{ color: "#f87171", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                      {line.text}
                    </div>
                  );
                }
                return (
                  <div
                    key={i}
                    className="mt-1 ml-3 pl-2 border-l"
                    style={{
                      borderColor: "rgba(129,140,248,0.15)",
                      color: "#9ca3af",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                    }}
                  >
                    {line.text}
                    {running && i === lines.length - 1 && line.kind === "output" && (
                      <span
                        className="inline-block w-2 h-3.5 ml-0.5 animate-pulse align-middle"
                        style={{ background: "#818cf8" }}
                      />
                    )}
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Input row */}
            <div
              className="flex items-center gap-2 px-4 py-3 border-t flex-shrink-0"
              style={{ borderColor: "rgba(129,140,248,0.15)", background: "#030308" }}
            >
              <span style={{ color: "#4ade80" }} className="font-mono text-[13px] font-bold flex-shrink-0">
                $
              </span>
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a command or /help…"
                disabled={running && !input.startsWith("/")}
                className="flex-1 bg-transparent font-mono text-[12px] outline-none"
                style={{ color: "#e2e8f0", caretColor: "#818cf8" }}
                autoComplete="off"
                spellCheck={false}
              />
              {running && (
                <button
                  onClick={() => { abortRef.current?.abort(); setRunning(false); }}
                  className="px-2 py-1 rounded text-[10px] font-mono border"
                  style={{ borderColor: "rgba(248,113,113,0.3)", color: "#f87171" }}
                >
                  ^C
                </button>
              )}
              <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: "rgba(129,140,248,0.4)" }} />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
