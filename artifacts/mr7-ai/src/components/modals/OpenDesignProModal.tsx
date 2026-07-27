// Open Design v0.15.1 — Premium Redesign
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Palette, Layers, Zap, CheckCircle2,
  Code2, GitBranch, Users, Globe, Lock,
  BarChart2, Shield, Download, Sparkles, Brain,
  Box, Figma, Component, Monitor, FileCode, Search,
} from "lucide-react";

const I = "#818cf8"; // indigo
const Ig = (n: number) => `rgba(129,140,248,${n})`;

interface OpenDesignProModalProps { open: boolean; onOpenChange: (v: boolean) => void; }

type Tab = "features" | "tokens" | "components" | "plugins";

const FEATURES = [
  { icon: Palette,   title: "Design Tokens System",    desc: "Centralized token management with auto-sync across all components. Supports W3C DTCG format.",    tag: "v0.15", color: "#818cf8" },
  { icon: Code2,     title: "Code Export 2.0",         desc: "Multi-framework export: React, Vue, Angular, Svelte, and vanilla CSS. TypeScript first.",            tag: "v0.15", color: "#60a5fa" },
  { icon: Users,     title: "Real-time Collaboration", desc: "WebSocket-powered co-editing with presence awareness, conflict resolution, and version history.",     tag: "v0.14", color: "#2dd4bf" },
  { icon: GitBranch, title: "Design Versioning",       desc: "Git-style branching for designs. Diff views, merge requests, and rollback support.",                 tag: "v0.15", color: "#fb923c" },
  { icon: Brain,     title: "AI Design Assistant",     desc: "Generate components from text, auto-layout suggestions, and smart asset replacement.",                tag: "NEW",   color: "#a78bfa" },
  { icon: Box,       title: "3D Layer Composer",       desc: "Three.js integration for 3D elements, parallax effects, and depth-aware layout systems.",             tag: "NEW",   color: "#22d3ee" },
  { icon: Shield,    title: "Design Linting",          desc: "Automated checks for accessibility (WCAG 2.2), brand compliance, and performance budgets.",           tag: "v0.14", color: "#4ade80" },
  { icon: Component, title: "Component Library Sync",  desc: "Bi-directional sync with Storybook, Bit.dev, and custom component registries.",                       tag: "v0.13", color: "#fbbf24" },
  { icon: Monitor,   title: "Responsive Breakpoints",  desc: "Visual breakpoint editor with per-breakpoint overrides and fluid typography scaling.",                 tag: "v0.12", color: "#f87171" },
  { icon: Figma,     title: "Figma Importer",          desc: "Import Figma files via API with fidelity preservation for fonts, effects, and auto-layout.",          tag: "v0.15", color: "#f472b6" },
  { icon: Globe,     title: "Internationalization",    desc: "RTL support, locale-aware typography, and integrated translation workflow.",                           tag: "v0.14", color: "#c084fc" },
  { icon: Zap,       title: "Performance Canvas",      desc: "GPU-accelerated WebGL canvas for smooth editing of designs with 1000+ elements.",                     tag: "v0.15", color: "#fbbf24" },
];

const TOKEN_GROUPS = [
  { name: "Colors",     count: 84,  preview: ["#818cf8","#60a5fa","#2dd4bf","#fb923c","#f87171"] },
  { name: "Typography", count: 24,  preview: [] },
  { name: "Spacing",    count: 16,  preview: [] },
  { name: "Shadows",    count: 12,  preview: [] },
  { name: "Radii",      count: 8,   preview: [] },
  { name: "Animations", count: 10,  preview: [] },
];

const COMPONENTS_LIST = [
  { name: "Button",       variants: 6,  desc: "Primary, Secondary, Ghost, Destructive, Link, Icon" },
  { name: "Input",        variants: 4,  desc: "Text, Password, Search, Textarea" },
  { name: "Card",         variants: 5,  desc: "Default, Elevated, Bordered, Glass, Interactive" },
  { name: "Modal",        variants: 3,  desc: "Default, Drawer, Fullscreen" },
  { name: "Navigation",   variants: 4,  desc: "Topbar, Sidebar, Tabs, Breadcrumb" },
  { name: "Data Table",   variants: 3,  desc: "Default, Sortable, Virtual" },
  { name: "Form",         variants: 2,  desc: "Default, Multi-step" },
  { name: "Chart",        variants: 8,  desc: "Bar, Line, Area, Pie, Donut, Scatter, Heatmap, Treemap" },
  { name: "Calendar",     variants: 2,  desc: "Picker, Range Picker" },
  { name: "Notification", variants: 4,  desc: "Toast, Alert, Banner, Badge" },
];

const PLUGINS = [
  { name: "AI Copilot",        desc: "Generate UI from descriptions using GPT-4o",      icon: "🤖", installed: true  },
  { name: "Figma Bridge",      desc: "Import/export from Figma with full fidelity",       icon: "🎨", installed: true  },
  { name: "Storybook Sync",    desc: "Sync components bidirectionally with Storybook",    icon: "📖", installed: true  },
  { name: "Tailwind Exporter", desc: "Export design tokens as Tailwind config",           icon: "💨", installed: false },
  { name: "Lottie Animator",   desc: "Animate SVG elements and export as Lottie JSON",   icon: "✨", installed: false },
  { name: "A11y Checker",      desc: "WCAG 2.2 contrast and keyboard nav audit",          icon: "♿", installed: false },
  { name: "Brand Guardian",    desc: "Enforce brand guidelines and color palettes",       icon: "🛡️", installed: false },
  { name: "Version Control",   desc: "Git-style branching for design files",              icon: "🌿", installed: true  },
];

const STATS = [
  { label: "COMPONENTS", value: "248", color: I },
  { label: "TOKENS",     value: "154", color: "#60a5fa" },
  { label: "PLUGINS",    value: "40+", color: "#2dd4bf" },
  { label: "FRAMEWORKS", value: "6",   color: "#fb923c" },
];

export function OpenDesignProModal({ open, onOpenChange }: OpenDesignProModalProps) {
  const [tab, setTab] = useState<Tab>("features");
  const [filter, setFilter] = useState("");

  if (!open) return null;

  const filteredFeatures = FEATURES.filter(f =>
    !filter ||
    f.title.toLowerCase().includes(filter.toLowerCase()) ||
    f.desc.toLowerCase().includes(filter.toLowerCase())
  );

  const TabBtn = ({ id, label }: { id: Tab; label: string }) => {
    const active = tab === id;
    return (
      <button
        onClick={() => setTab(id)}
        className="relative px-3.5 py-2 rounded-xl text-[11px] font-black font-mono tracking-wide transition-all"
        style={{
          background: active ? Ig(0.14) : "transparent",
          border: `1px solid ${active ? Ig(0.4) : "transparent"}`,
          color: active ? I : "rgba(255,255,255,0.42)",
          boxShadow: active ? `0 0 16px ${Ig(0.2)}` : "none",
        }}
      >
        {label}
        {active && (
          <motion.div
            layoutId="pro-tab-indicator"
            className="absolute bottom-0 inset-x-3 h-px rounded-full"
            style={{ background: I }}
          />
        )}
      </button>
    );
  };

  return (
    <AnimatePresence>
      {/* Overlay */}
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.88)", backdropFilter: "blur(20px)" }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      >
        {/* Shell */}
        <motion.div
          className="relative flex flex-col w-full h-full max-w-5xl max-h-[90vh] rounded-2xl overflow-hidden"
          style={{
            background: "linear-gradient(160deg, rgba(8,8,20,0.97) 0%, rgba(4,4,12,0.98) 100%)",
            backdropFilter: "blur(40px)",
            border: `1px solid ${Ig(0.25)}`,
            boxShadow: `0 0 80px ${Ig(0.1)}, 0 40px 80px rgba(0,0,0,0.6), inset 0 1px 0 ${Ig(0.15)}`,
          }}
          initial={{ scale: 0.94, y: 24 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
        >
          {/* Top accent line */}
          <div className="absolute inset-x-0 top-0 h-px z-20" style={{ background: `linear-gradient(90deg, transparent, ${I}, rgba(96,165,250,0.8), transparent)` }} />

          {/* Scan line */}
          <motion.div
            className="absolute inset-x-0 h-px pointer-events-none z-10"
            style={{ background: `linear-gradient(90deg, transparent, ${Ig(0.5)}, transparent)` }}
            animate={{ top: ["0%", "100%"] }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          />

          {/* ── HEADER ── */}
          <div className="relative z-10 flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: Ig(0.12), background: "rgba(0,0,0,0.45)" }}>
            <div className="flex items-center gap-3">
              <motion.div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: `linear-gradient(135deg, ${Ig(0.25)}, ${Ig(0.08)})`, border: `1px solid ${Ig(0.4)}` }}
                animate={{ boxShadow: [`0 0 10px ${Ig(0.2)}`, `0 0 24px ${Ig(0.45)}`, `0 0 10px ${Ig(0.2)}`] }}
                transition={{ duration: 2.5, repeat: Infinity }}
              >
                <Palette size={18} style={{ color: I, filter: `drop-shadow(0 0 6px ${Ig(0.8)})` }} />
              </motion.div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-black font-mono tracking-wide" style={{ color: "rgba(255,255,255,0.9)" }}>OPEN DESIGN</span>
                  <span className="px-2 py-0.5 rounded-lg text-[9px] font-black font-mono tracking-wide" style={{ background: "rgba(250,204,21,0.14)", color: "#fbbf24", border: "1px solid rgba(250,204,21,0.3)" }}>v0.15.1 STABLE</span>
                </div>
                <div className="text-[10px] font-mono" style={{ color: "rgba(255,255,255,0.3)" }}>Open-Source Design System · 248 components · 40+ plugins</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <motion.button
                whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black"
                style={{ background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.28)", color: "#4ade80" }}
              >
                <Download size={11} />v0.15.1
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
                onClick={() => onOpenChange(false)}
                className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
              >
                <X size={14} style={{ color: "rgba(255,255,255,0.6)" }} />
              </motion.button>
            </div>
          </div>

          {/* ── STATS STRIP ── */}
          <div className="grid grid-cols-4 border-b" style={{ borderColor: Ig(0.1) }}>
            {STATS.map((s, i) => (
              <div key={s.label} className="p-3.5 text-center border-r last:border-r-0 relative overflow-hidden" style={{ borderColor: Ig(0.07) }}>
                <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 50% 0%, ${s.color}10 0%, transparent 70%)` }} />
                <div className="text-2xl font-black font-mono relative" style={{ color: s.color, textShadow: `0 0 20px ${s.color}60` }}>{s.value}</div>
                <div className="text-[8px] font-black tracking-widest font-mono mt-0.5 relative" style={{ color: "rgba(255,255,255,0.28)" }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* ── TABS ── */}
          <div className="flex items-center gap-1 px-4 py-2.5 border-b" style={{ borderColor: Ig(0.08), background: "rgba(0,0,0,0.25)" }}>
            <TabBtn id="features"   label="FEATURES"   />
            <TabBtn id="tokens"     label="TOKENS"     />
            <TabBtn id="components" label="COMPONENTS" />
            <TabBtn id="plugins"    label="PLUGINS"    />
          </div>

          {/* ── CONTENT ── */}
          <div className="flex-1 overflow-hidden">
            <AnimatePresence mode="wait">

              {/* FEATURES */}
              {tab === "features" && (
                <motion.div key="features" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col h-full">
                  {/* Search */}
                  <div className="px-4 py-2.5 border-b" style={{ borderColor: Ig(0.08) }}>
                    <div className="relative">
                      <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "rgba(255,255,255,0.3)" }} />
                      <input
                        value={filter} onChange={e => setFilter(e.target.value)}
                        placeholder="Search features…"
                        className="w-full bg-transparent outline-none text-[11px] font-mono pl-8 pr-4 py-1.5 rounded-xl transition-all"
                        style={{
                          color: "rgba(255,255,255,0.75)",
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.08)",
                        }}
                        onFocus={e => (e.currentTarget.style.border = `1px solid ${Ig(0.45)}`)}
                        onBlur={e => (e.currentTarget.style.border = "1px solid rgba(255,255,255,0.08)")}
                      />
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 gap-3">
                    {filteredFeatures.map((f, i) => {
                      const Icon = f.icon;
                      return (
                        <motion.div
                          key={f.title}
                          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                          whileHover={{ scale: 1.01, y: -1 }}
                          className="p-4 rounded-2xl relative overflow-hidden cursor-default"
                          style={{
                            background: `linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)`,
                            border: `1px solid ${f.color}22`,
                            boxShadow: `0 2px 12px rgba(0,0,0,0.3)`
                          }}
                        >
                          <div className="absolute top-0 inset-x-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${f.color}55, transparent)` }} />
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${f.color}18`, border: `1px solid ${f.color}30` }}>
                              <Icon size={16} style={{ color: f.color, filter: `drop-shadow(0 0 4px ${f.color}80)` }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                <span className="text-[11.5px] font-bold font-mono" style={{ color: "rgba(255,255,255,0.82)" }}>{f.title}</span>
                                <span className="text-[8px] px-1.5 py-0.5 rounded-md font-black font-mono"
                                  style={{ background: f.tag === "NEW" ? "rgba(250,204,21,0.14)" : Ig(0.12), color: f.tag === "NEW" ? "#fbbf24" : I, border: `1px solid ${f.tag === "NEW" ? "rgba(250,204,21,0.3)" : Ig(0.3)}` }}>
                                  {f.tag}
                                </span>
                              </div>
                              <p className="text-[10.5px] leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>{f.desc}</p>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* TOKENS */}
              {tab === "tokens" && (
                <motion.div key="tokens" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="h-full overflow-y-auto p-4 space-y-3">
                  {TOKEN_GROUPS.map((g, i) => (
                    <motion.div
                      key={g.name}
                      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                      whileHover={{ scale: 1.005 }}
                      className="p-4 rounded-2xl"
                      style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${Ig(0.14)}` }}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-bold text-sm font-mono" style={{ color: "rgba(255,255,255,0.78)" }}>{g.name}</span>
                        <span className="text-[10px] font-black font-mono" style={{ color: I }}>{g.count} tokens</span>
                      </div>
                      {g.preview.length > 0 && (
                        <div className="flex gap-2 flex-wrap">
                          {g.preview.map(c => (
                            <div key={c} className="w-8 h-8 rounded-xl shadow-lg" style={{ background: c, boxShadow: `0 0 10px ${c}40` }} />
                          ))}
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-[9px] font-bold font-mono" style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.35)", border: "1px solid rgba(255,255,255,0.08)" }}>+{g.count - g.preview.length}</div>
                        </div>
                      )}
                      {g.name === "Typography" && (
                        <div className="space-y-2 mt-1">
                          {[["Display XL","72px / 900"],["Heading 1","48px / 800"],["Body","16px / 400"]].map(([n, v]) => (
                            <div key={n} className="flex justify-between items-center py-1.5 border-b last:border-b-0" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                              <span className="text-[11px] font-mono" style={{ color: "rgba(255,255,255,0.55)" }}>{n}</span>
                              <span className="text-[10px] font-mono" style={{ color: "rgba(255,255,255,0.28)" }}>{v}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {g.name === "Spacing" && (
                        <div className="flex gap-2 mt-2 items-end">
                          {[4,8,12,16,24,32,48].map(v => (
                            <div key={v} className="flex flex-col items-center gap-1">
                              <div className="rounded" style={{ width: 4, height: v / 2, background: Ig(0.6) }} />
                              <span className="text-[7px] font-mono" style={{ color: "rgba(255,255,255,0.25)" }}>{v}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  ))}
                </motion.div>
              )}

              {/* COMPONENTS */}
              {tab === "components" && (
                <motion.div key="components" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="h-full overflow-y-auto p-4 space-y-2">
                  {COMPONENTS_LIST.map((c, i) => (
                    <motion.div
                      key={c.name}
                      initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                      whileHover={{ x: 2, scale: 1.005 }}
                      className="flex items-center gap-3 p-3.5 rounded-xl"
                      style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${Ig(0.1)}` }}
                    >
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: Ig(0.14), border: `1px solid ${Ig(0.28)}` }}>
                        <Component size={15} style={{ color: I, filter: `drop-shadow(0 0 4px ${Ig(0.7)})` }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-bold font-mono" style={{ color: "rgba(255,255,255,0.82)" }}>{c.name}</div>
                        <div className="text-[10px] font-mono truncate" style={{ color: "rgba(255,255,255,0.38)" }}>{c.desc}</div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-lg font-black font-mono" style={{ color: I, textShadow: `0 0 12px ${Ig(0.5)}` }}>{c.variants}</div>
                        <div className="text-[8px] font-mono" style={{ color: "rgba(255,255,255,0.25)" }}>variants</div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}

              {/* PLUGINS */}
              {tab === "plugins" && (
                <motion.div key="plugins" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="h-full overflow-y-auto p-4 grid grid-cols-2 gap-3">
                  {PLUGINS.map((p, i) => (
                    <motion.div
                      key={p.name}
                      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                      whileHover={{ scale: 1.02, y: -1 }}
                      className="p-4 rounded-2xl relative overflow-hidden"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: `1px solid ${p.installed ? Ig(0.2) : "rgba(255,255,255,0.07)"}`,
                        boxShadow: p.installed ? `0 0 16px ${Ig(0.06)}` : "none"
                      }}
                    >
                      {p.installed && <div className="absolute top-0 inset-x-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${Ig(0.5)}, transparent)` }} />}
                      <div className="flex items-start gap-3">
                        <span className="text-2xl leading-none mt-0.5">{p.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-[12px] font-bold font-mono" style={{ color: "rgba(255,255,255,0.82)" }}>{p.name}</span>
                            {p.installed && <CheckCircle2 size={12} style={{ color: "#4ade80", filter: "drop-shadow(0 0 4px #4ade8080)" }} />}
                          </div>
                          <p className="text-[10.5px] leading-relaxed mb-3" style={{ color: "rgba(255,255,255,0.42)" }}>{p.desc}</p>
                          <motion.button
                            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[9px] font-black"
                            style={{
                              background: p.installed ? "rgba(74,222,128,0.1)" : Ig(0.1),
                              border: `1px solid ${p.installed ? "rgba(74,222,128,0.28)" : Ig(0.28)}`,
                              color: p.installed ? "#4ade80" : I
                            }}
                          >
                            {p.installed
                              ? <><CheckCircle2 size={9} />INSTALLED</>
                              : <><FileCode size={9} />INSTALL</>}
                          </motion.button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── FOOTER ── */}
          <div className="px-5 py-2.5 border-t flex items-center justify-between" style={{ borderColor: Ig(0.1), background: "rgba(0,0,0,0.45)" }}>
            <div className="flex items-center gap-2">
              <div className="px-2 py-[3px] rounded-full text-[8px] font-mono" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.32)" }}>MIT License</div>
              <span className="text-[8px] font-mono" style={{ color: "rgba(255,255,255,0.2)" }}>open-design.dev · v0.15.1</span>
            </div>
            <motion.div animate={{ opacity: [0.4, 0.9, 0.4] }} transition={{ duration: 2.2, repeat: Infinity }}>
              <Sparkles size={13} style={{ color: I, filter: `drop-shadow(0 0 4px ${Ig(0.7)})` }} />
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
