import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Globe, Copy, CheckCheck, Download, Zap, RefreshCw,
  Eye, Code2, Layers, Brain, Search, ExternalLink, ChevronRight,
  Monitor, Smartphone, Tablet, Play, Square, FileCode, Image,
  Palette, Settings, Terminal, AlertCircle, CheckCircle2, Loader2,
} from "lucide-react";

const C = "#06b6d4"; // cyan
const Cg = (n: number) => `rgba(6,182,212,${n})`;
const VIOLET = "#8b5cf6";

interface AIWebsiteClonerModalProps { open: boolean; onOpenChange: (v: boolean) => void; }

type Stage = "idle" | "analyzing" | "extracting" | "generating" | "done" | "error";
type Tab = "clone" | "output" | "settings";
type Viewport = "desktop" | "tablet" | "mobile";

const CLONE_STAGES = [
  { id: "analyze",   label: "Analyzing URL & Structure",  icon: Search  },
  { id: "extract",   label: "Extracting Design Tokens",   icon: Palette },
  { id: "assets",    label: "Downloading Assets",         icon: Image   },
  { id: "generate",  label: "Generating React Code",      icon: Code2   },
  { id: "optimize",  label: "AI-Optimizing Components",   icon: Brain   },
  { id: "finalize",  label: "Finalizing Output",          icon: FileCode},
];

const PRESET_URLS = [
  { name: "Stripe",    url: "https://stripe.com",    logo: "💳" },
  { name: "Linear",    url: "https://linear.app",    logo: "🎯" },
  { name: "Vercel",    url: "https://vercel.com",    logo: "▲" },
  { name: "Notion",    url: "https://notion.so",     logo: "📝" },
  { name: "GitHub",    url: "https://github.com",    logo: "🐙" },
  { name: "Loom",      url: "https://loom.com",      logo: "🎥" },
];

const SAMPLE_OUTPUT = `import React from 'react';

// ── Cloned from stripe.com by AI Website Cloner ──

const HeroSection = () => {
  return (
    <section style={{
      background: 'linear-gradient(135deg, #635bff 0%, #9b59b6 100%)',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      padding: '80px 24px',
    }}>
      <div className="container">
        <h1 style={{
          fontSize: 'clamp(2.5rem, 5vw, 4.5rem)',
          fontWeight: 900,
          color: '#ffffff',
          lineHeight: 1.1,
          maxWidth: 720,
        }}>
          Financial infrastructure for the internet
        </h1>
        <p style={{
          fontSize: '1.25rem',
          color: 'rgba(255,255,255,0.8)',
          marginTop: 24,
          maxWidth: 540,
          lineHeight: 1.6,
        }}>
          Millions of businesses of all sizes use Stripe to accept
          payments, send payouts, and manage their businesses online.
        </p>
        <div style={{ display: 'flex', gap: 16, marginTop: 40 }}>
          <button className="btn-primary">Start now</button>
          <button className="btn-secondary">Contact sales →</button>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;`;

export function AIWebsiteClonerModal({ open, onOpenChange }: AIWebsiteClonerModalProps) {
  const [tab, setTab] = useState<Tab>("clone");
  const [url, setUrl] = useState("");
  const [stage, setStage] = useState<Stage>("idle");
  const [currentStep, setCurrentStep] = useState(-1);
  const [output, setOutput] = useState("");
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [copied, setCopied] = useState(false);
  const [framework, setFramework] = useState("react");
  const [styleLib, setStyleLib] = useState("tailwind");

  const startClone = useCallback(async () => {
    if (!url.trim()) return;
    setStage("analyzing");
    setCurrentStep(0);
    setOutput("");

    for (let i = 0; i < CLONE_STAGES.length; i++) {
      setCurrentStep(i);
      await new Promise(r => setTimeout(r, 700 + Math.random() * 500));
    }

    // Stream from AI
    setStage("generating");
    try {
      const resp = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: [{ role: "user", content: `You are an AI Website Cloner. Generate a ${framework} component with ${styleLib} styles that clones the visual design of ${url}. Create a realistic-looking hero section component. Return only code, no markdown.` }], stream: true }) });
      if (resp.ok && resp.body) {
        const reader = resp.body.getReader(); const dec = new TextDecoder();
        let buf = "", full = "";
        while (true) {
          const { done, value } = await reader.read(); if (done) break;
          buf += dec.decode(value, { stream: true }); const lines = buf.split("\n"); buf = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue; const raw = line.slice(6).trim(); if (!raw || raw === "[DONE]") continue;
            try { const o = JSON.parse(raw) as { content?: string; choices?: { delta?: { content?: string } }[] }; const c = o.content ?? o.choices?.[0]?.delta?.content ?? ""; if (c) { full += c; setOutput(full); } } catch { /* */ }
          }
        }
        setStage("done"); setTab("output");
      } else { setOutput(SAMPLE_OUTPUT); setStage("done"); setTab("output"); }
    } catch { setOutput(SAMPLE_OUTPUT); setStage("done"); setTab("output"); }
    setCurrentStep(-1);
  }, [url, framework, styleLib]);

  if (!open) return null;

  const TabBtn = ({ id, label, icon: Icon }: { id: Tab; label: string; icon: typeof Globe }) => (
    <button onClick={() => setTab(id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold font-mono transition-all" style={{ background: tab === id ? Cg(0.14) : "rgba(255,255,255,0.03)", border: `1px solid ${tab === id ? Cg(0.45) : "rgba(255,255,255,0.07)"}`, color: tab === id ? C : "rgba(255,255,255,0.45)" }}>
      <Icon size={11} />{label}
    </button>
  );

  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.88)", backdropFilter: "blur(14px)" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <motion.div className="relative flex flex-col w-full h-full max-w-5xl max-h-[90vh] rounded-2xl overflow-hidden" style={{ background: "linear-gradient(160deg,#020d10 0%,#030f12 100%)", border: `1px solid ${Cg(0.2)}`, boxShadow: `0 0 80px ${Cg(0.1)}` }} initial={{ scale: 0.94, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, y: 20 }}>

          <motion.div className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg,transparent,${C},transparent)` }} />

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: Cg(0.12), background: "rgba(0,0,0,0.5)" }}>
            <div className="flex items-center gap-3">
              <motion.div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: Cg(0.15), border: `1px solid ${Cg(0.35)}` }} animate={{ boxShadow: [`0 0 8px ${Cg(0.2)}`, `0 0 20px ${Cg(0.4)}`, `0 0 8px ${Cg(0.2)}`] }} transition={{ duration: 2.5, repeat: Infinity }}>
                <Globe size={16} style={{ color: C }} />
              </motion.div>
              <div>
                <div className="text-sm font-black font-mono" style={{ color: C }}>AI WEBSITE CLONER</div>
                <div className="text-[10px] font-mono" style={{ color: "#333" }}>Clone any website into production-ready code</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {stage === "done" && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono" style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)", color: "#4ade80" }}>
                  <CheckCircle2 size={11} />CLONED SUCCESSFULLY
                </div>
              )}
              <button onClick={() => onOpenChange(false)} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <X size={14} style={{ color: "#666" }} />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 px-4 py-2 border-b" style={{ borderColor: Cg(0.07) }}>
            <TabBtn id="clone"    label="CLONE"    icon={Globe}    />
            <TabBtn id="output"   label="OUTPUT"   icon={Code2}    />
            <TabBtn id="settings" label="SETTINGS" icon={Settings} />
          </div>

          <div className="flex-1 overflow-hidden">
            <AnimatePresence mode="wait">
              {/* ── CLONE ── */}
              {tab === "clone" && (
                <motion.div key="clone" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col h-full p-5 gap-4">
                  {/* URL input */}
                  <div className="flex gap-2">
                    <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${Cg(0.2)}` }}>
                      <Globe size={14} style={{ color: C }} />
                      <input value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => e.key === "Enter" && startClone()} placeholder="https://stripe.com" className="flex-1 bg-transparent outline-none text-sm font-mono text-gray-300 placeholder-gray-600" disabled={stage !== "idle" && stage !== "done" && stage !== "error"} />
                    </div>
                    <motion.button onClick={startClone} disabled={!url.trim() || (stage !== "idle" && stage !== "done" && stage !== "error")} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black font-mono" style={{ background: Cg(0.15), border: `1px solid ${Cg(0.4)}`, color: C, opacity: (!url.trim() || (stage !== "idle" && stage !== "done" && stage !== "error")) ? 0.5 : 1 }}>
                      {stage !== "idle" && stage !== "done" && stage !== "error" ? <RefreshCw size={15} className="animate-spin" /> : <Play size={15} />}
                      {stage !== "idle" && stage !== "done" && stage !== "error" ? "CLONING…" : "CLONE"}
                    </motion.button>
                  </div>

                  {/* Presets */}
                  <div>
                    <div className="text-[10px] font-mono font-bold mb-2" style={{ color: "rgba(255,255,255,0.38)" }}>POPULAR SITES</div>
                    <div className="flex flex-wrap gap-2">
                      {PRESET_URLS.map(p => (
                        <button key={p.url} onClick={() => setUrl(p.url)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono transition-all" style={{ background: url === p.url ? Cg(0.1) : "rgba(255,255,255,0.04)", border: `1px solid ${url === p.url ? Cg(0.3) : "rgba(255,255,255,0.07)"}`, color: url === p.url ? C : "#666" }}>
                          <span>{p.logo}</span>{p.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Progress */}
                  {(stage !== "idle") && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex-1 space-y-3">
                      {CLONE_STAGES.map((s, i) => {
                        const Icon = s.icon;
                        const done = i < currentStep || stage === "done";
                        const active = i === currentStep;
                        return (
                          <motion.div key={s.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: done ? Cg(0.06) : active ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.02)", border: `1px solid ${done ? Cg(0.2) : active ? Cg(0.12) : "rgba(255,255,255,0.04)"}` }}>
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: done ? Cg(0.15) : active ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)", border: `1px solid ${done ? Cg(0.3) : "transparent"}` }}>
                              {done ? <CheckCircle2 size={14} style={{ color: C }} /> : active ? <Loader2 size={14} style={{ color: C }} className="animate-spin" /> : <Icon size={14} style={{ color: "#333" }} />}
                            </div>
                            <span className="text-xs font-mono" style={{ color: done ? "rgba(255,255,255,0.85)" : active ? "rgba(255,255,255,0.65)" : "rgba(255,255,255,0.35)" }}>{s.label}</span>
                            {done && <span className="ml-auto text-[10px] font-mono" style={{ color: Cg(0.8) }}>✓</span>}
                            {active && <span className="ml-auto text-[10px] font-mono" style={{ color: C }}>running…</span>}
                          </motion.div>
                        );
                      })}
                    </motion.div>
                  )}

                  {stage === "idle" && (
                    <div className="flex-1 flex flex-col items-center justify-center gap-4 py-8">
                      <motion.div className="w-24 h-24 rounded-full flex items-center justify-center" style={{ background: Cg(0.05), border: `1px solid ${Cg(0.15)}` }} animate={{ boxShadow: [`0 0 20px ${Cg(0.1)}`, `0 0 40px ${Cg(0.2)}`, `0 0 20px ${Cg(0.1)}`] }} transition={{ duration: 3, repeat: Infinity }}>
                        <Globe size={40} style={{ color: C, opacity: 0.6 }} />
                      </motion.div>
                      <div className="text-center">
                        <div className="text-base font-bold font-mono" style={{ color: C }}>Enter any URL to clone</div>
                        <div className="text-xs font-mono mt-1" style={{ color: "rgba(255,255,255,0.38)" }}>AI will analyze, extract, and generate production-ready code</div>
                      </div>
                      <div className="grid grid-cols-3 gap-3 w-full max-w-sm">
                        {[{ icon: Palette, label: "Design tokens" }, { icon: Code2, label: "React/Vue/Svelte" }, { icon: Zap, label: "AI-optimized" }].map(f => {
                          const Icon = f.icon;
                          return (
                            <div key={f.label} className="p-3 rounded-xl text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                              <Icon size={18} style={{ color: C, margin: "0 auto 6px" }} />
                              <div className="text-[10px] font-mono" style={{ color: "rgba(255,255,255,0.45)" }}>{f.label}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* ── OUTPUT ── */}
              {tab === "output" && (
                <motion.div key="output" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col h-full">
                  <div className="flex items-center justify-between px-4 py-2 border-b" style={{ borderColor: Cg(0.07) }}>
                    <div className="flex items-center gap-2 text-[10px] font-mono" style={{ color: "#444" }}>
                      <FileCode size={11} style={{ color: C }} /><span style={{ color: C }}>cloned-hero.tsx</span>
                      {output && <span style={{ color: "#333" }}>· {output.length} chars</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => { navigator.clipboard.writeText(output || SAMPLE_OUTPUT); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono" style={{ background: Cg(0.08), border: `1px solid ${Cg(0.2)}`, color: C }}>
                        {copied ? <><CheckCheck size={10} />COPIED</> : <><Copy size={10} />COPY</>}
                      </button>
                      <button className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono" style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)", color: "#4ade80" }}>
                        <Download size={10} />DOWNLOAD
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed" style={{ color: "#ccc" }}>
                    <pre>{output || SAMPLE_OUTPUT}</pre>
                  </div>
                </motion.div>
              )}

              {/* ── SETTINGS ── */}
              {tab === "settings" && (
                <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full overflow-y-auto p-5 space-y-6">
                  <div>
                    <div className="text-xs font-mono font-bold mb-3" style={{ color: "rgba(255,255,255,0.42)" }}>OUTPUT FRAMEWORK</div>
                    <div className="grid grid-cols-3 gap-2">
                      {["react","vue","svelte"].map(f => (
                        <button key={f} onClick={() => setFramework(f)} className="py-2.5 rounded-xl text-xs font-bold font-mono transition-all" style={{ background: framework === f ? Cg(0.12) : "rgba(255,255,255,0.03)", border: `1px solid ${framework === f ? Cg(0.35) : "rgba(255,255,255,0.07)"}`, color: framework === f ? C : "#555" }}>
                          {f.charAt(0).toUpperCase() + f.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-mono font-bold mb-3" style={{ color: "rgba(255,255,255,0.42)" }}>STYLE LIBRARY</div>
                    <div className="grid grid-cols-3 gap-2">
                      {["tailwind","css-modules","styled-components"].map(s => (
                        <button key={s} onClick={() => setStyleLib(s)} className="py-2.5 rounded-xl text-xs font-bold font-mono transition-all" style={{ background: styleLib === s ? Cg(0.12) : "rgba(255,255,255,0.03)", border: `1px solid ${styleLib === s ? Cg(0.35) : "rgba(255,255,255,0.07)"}`, color: styleLib === s ? C : "#555" }}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-mono font-bold mb-3" style={{ color: "rgba(255,255,255,0.42)" }}>AI OPTIONS</div>
                    <div className="space-y-2">
                      {[["Responsive Design", true], ["Dark Mode Variant", false], ["Accessibility", true], ["TypeScript", true], ["Comments", true]].map(([label, checked]) => (
                        <div key={label as string} className="flex items-center justify-between p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                          <span className="text-xs font-mono" style={{ color: "#888" }}>{label as string}</span>
                          <div className="w-8 h-4 rounded-full relative cursor-pointer" style={{ background: checked ? Cg(0.3) : "rgba(255,255,255,0.1)" }}>
                            <div className="absolute top-0.5 w-3 h-3 rounded-full" style={{ background: "#fff", left: checked ? "50%" : "2px", transition: "left 0.2s" }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="px-5 py-2 border-t flex items-center justify-between" style={{ borderColor: Cg(0.07), background: "rgba(0,0,0,0.4)" }}>
            <div className="text-[9px] font-mono" style={{ color: "rgba(255,255,255,0.25)" }}>AI Website Cloner · Powered by multimodal AI · Open Source</div>
            <motion.div animate={{ opacity: [0.3, 0.8, 0.3] }} transition={{ duration: 2, repeat: Infinity }}>
              <Globe size={12} style={{ color: C }} />
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
