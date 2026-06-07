import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Palette, GitMerge, Copy, CheckCheck, RotateCcw } from "lucide-react";
import { pipeline } from "@/lib/pipeline";
import { useStore } from "@/lib/store";

interface UIUXProModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const MODES = [
  { id: "wireframe", label: "Wireframe Gen", desc: "Generate ASCII/text wireframes" },
  { id: "critique", label: "UI Critique", desc: "Analyze and improve UI designs" },
  { id: "component", label: "Component Code", desc: "Generate React/HTML components" },
  { id: "ux", label: "UX Flow", desc: "Map user flows and journeys" },
  { id: "color", label: "Color System", desc: "Generate accessible color palettes" },
  { id: "copy", label: "UX Copy", desc: "Microcopy and content strategy" },
];

export function UIUXProModal({ open, onOpenChange }: UIUXProModalProps) {
  const [mode, setMode] = useState("wireframe");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const { dispatch } = useStore();

  async function generate() {
    if (!input.trim() || running) return;
    setRunning(true);
    setOutput("");

    const systemPrompts: Record<string, string> = {
      wireframe: "You are a senior UX designer. Generate detailed ASCII wireframes with clear layout, spacing, and component labels. Use box-drawing characters (┌─┐│└─┘), labels, and annotations. Make wireframes realistic and detailed.",
      critique: "You are a senior UX/UI design critic. Analyze the described design critically covering: visual hierarchy, spacing, color contrast, typography, accessibility (WCAG), user flow friction, mobile responsiveness, and conversion optimization. Give specific actionable improvements with reasoning.",
      component: "You are an expert React/Tailwind developer. Generate clean, accessible, production-ready React components with Tailwind CSS. Include all states (hover, focus, disabled, loading), proper ARIA attributes, and TypeScript types.",
      ux: "You are a UX strategist. Map complete user journeys with: entry points, steps, decision nodes, emotions at each step, friction points, and success metrics. Use structured format with clear flow arrows.",
      color: "You are a color systems designer. Generate a complete, accessible color palette: primary, secondary, accent, neutral, semantic (success/warning/error/info) colors with exact hex values, WCAG contrast ratios, light and dark mode variants, and usage guidelines.",
      copy: "You are a UX copywriter. Write clear, concise, user-centered microcopy: button labels, error messages, empty states, tooltips, onboarding text, CTAs. Follow voice and tone guidelines. Make every word count.",
    };

    const activeMode = MODES.find((m) => m.id === mode);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "system", content: systemPrompts[mode] },
            { role: "user", content: input },
          ],
          model: "gpt-5.4",
          stream: true,
        }),
      });
      const reader = res.body?.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let full = "";
      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6);
          if (raw === "[DONE]") continue;
          try {
            const chunk = JSON.parse(raw);
            const delta = chunk.choices?.[0]?.delta?.content ?? "";
            full += delta;
            setOutput(full);
          } catch { /* ignore */ }
        }
      }
      pipeline.push({ source: "UIUXPRO", sourceColor: "#ec4899", label: `${activeMode?.label}: ${input.slice(0, 30)}`, content: full });
    } catch { /* ignore */ }
    setRunning(false);
  }

  function injectToChat() {
    if (!output) return;
    dispatch({ type: "SET_SETTINGS", patch: { customSystemPrompt: `You are a UI/UX expert. Context from analysis:\n\n${output}\n\nHelp the user design and improve their interface.` } });
  }

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4"
          style={{ backdropFilter: "blur(10px)", background: "rgba(0,0,0,0.85)" }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden"
            style={{ background: "#080808", border: "1px solid rgba(236,72,153,0.25)", boxShadow: "0 0 60px rgba(236,72,153,0.1)" }}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "rgba(236,72,153,0.2)", background: "rgba(236,72,153,0.04)" }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center border" style={{ background: "rgba(236,72,153,0.1)", borderColor: "rgba(236,72,153,0.4)" }}>
                  <Palette className="w-4 h-4" style={{ color: "#ec4899" }} />
                </div>
                <div>
                  <div className="text-sm font-black tracking-widest" style={{ color: "#ec4899" }}>UI/UX PRO MAX</div>
                  <div className="text-[10px] mt-0.5" style={{ color: "#555" }}>Design intelligence · Wireframes · Components · UX flows</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => { setOutput(""); setInput(""); }} className="p-1.5 rounded-lg text-gray-600 hover:text-pink-400 transition-colors">
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button onClick={() => onOpenChange(false)} className="p-1.5 rounded-lg text-gray-600 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Mode selector */}
            <div className="flex gap-1.5 p-3 border-b flex-wrap" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              {MODES.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all"
                  style={{
                    background: mode === m.id ? "rgba(236,72,153,0.15)" : "transparent",
                    borderColor: mode === m.id ? "rgba(236,72,153,0.5)" : "rgba(255,255,255,0.08)",
                    color: mode === m.id ? "#ec4899" : "#444",
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* Output */}
            <div className="flex-1 overflow-y-auto p-4">
              {!output && !running && (
                <div className="flex flex-col items-center justify-center py-14 gap-3">
                  <Palette className="w-10 h-10" style={{ color: "#1a0010" }} />
                  <div className="text-[11px] font-mono" style={{ color: "#333" }}>
                    {MODES.find((m) => m.id === mode)?.desc}
                  </div>
                </div>
              )}
              {(output || running) && (
                <pre className="text-[11px] leading-relaxed font-mono whitespace-pre-wrap" style={{ color: "#888" }}>
                  {output}{running && <span className="animate-pulse">▊</span>}
                </pre>
              )}
            </div>

            {output && !running && (
              <div className="px-4 py-2 flex items-center gap-2 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                <button
                  onClick={() => { navigator.clipboard.writeText(output); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold border"
                  style={{ background: "rgba(236,72,153,0.06)", borderColor: "rgba(236,72,153,0.2)", color: "#ec4899" }}
                >
                  {copied ? <CheckCheck className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copied ? "Copied" : "Copy"}
                </button>
                <button
                  onClick={injectToChat}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold border"
                  style={{ background: "rgba(16,185,129,0.06)", borderColor: "rgba(16,185,129,0.2)", color: "#10b981" }}
                >
                  Inject to Chat
                </button>
                <button
                  onClick={() => pipeline.push({ source: "UIUXPRO", sourceColor: "#ec4899", label: "UI/UX output", content: output })}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold border"
                  style={{ background: "rgba(0,229,204,0.06)", borderColor: "rgba(0,229,204,0.2)", color: "#00e5cc" }}
                >
                  <GitMerge className="w-3 h-3" />
                  Pipe
                </button>
              </div>
            )}

            <div className="p-4 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <div className="flex gap-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); generate(); } }}
                  placeholder={`Describe what you want to ${MODES.find((m) => m.id === mode)?.label.toLowerCase()}…`}
                  disabled={running}
                  rows={2}
                  className="flex-1 bg-transparent border rounded-xl px-3 py-2 text-[12px] outline-none resize-none"
                  style={{ borderColor: "rgba(236,72,153,0.2)", color: "#ccc" }}
                />
                <button
                  onClick={generate}
                  disabled={running || !input.trim()}
                  className="w-9 rounded-xl flex items-center justify-center disabled:opacity-30"
                  style={{ background: "rgba(236,72,153,0.2)", border: "1px solid rgba(236,72,153,0.4)" }}
                >
                  <Send className="w-4 h-4" style={{ color: "#ec4899" }} />
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
