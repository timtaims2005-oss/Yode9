import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Search, Brain, Shield, Skull, Zap, Star, Crown, Plus,
  Edit3, Trash2, Check, Copy, Download, Upload, RefreshCw,
  Filter, Grid, List, Bookmark, BookOpen, Eye, Lock, Flame,
  Code2, Globe, Network, Database, Cpu, Crosshair, Activity,
  ChevronRight, ChevronDown, Sparkles, AlertTriangle, Save,
} from "lucide-react";
import { PERSONA_PRESETS, type PersonaPreset } from "./PersonaEditorModal";
import { useStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";

const CATEGORY_META: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  general:    { label: "عام",         color: "#22c55e", icon: Brain },
  uncensored: { label: "بلا قيود",    color: "#f59e0b", icon: Skull },
  security:   { label: "أمن سيبراني", color: "#e21227", icon: Shield },
  specialist: { label: "متخصص",       color: "#6366f1", icon: Star },
};

type CustomPersona = {
  id: string;
  name: string;
  nameAr: string;
  desc: string;
  color: string;
  category: string;
  prompt: string;
  createdAt: number;
};

function loadCustomPersonas(): CustomPersona[] {
  try {
    return JSON.parse(localStorage.getItem("mr7-custom-personas") || "[]");
  } catch { return []; }
}

function saveCustomPersonas(arr: CustomPersona[]) {
  localStorage.setItem("mr7-custom-personas", JSON.stringify(arr));
}

function HolographicHeader() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const tRef = useRef(0);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    const W = 800, H = 120;
    cv.width = W * DPR; cv.height = H * DPR;
    ctx.scale(DPR, DPR);

    const nodes: { x: number; y: number; vx: number; vy: number; r: number; color: string; type: string }[] = [];
    const COLORS = ["#e21227", "#a78bfa", "#06b6d4", "#22c55e", "#f59e0b", "#6366f1", "#ec4899", "#0ea5e9"];
    for (let i = 0; i < 50; i++) {
      nodes.push({
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 2 + 0.5,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        type: Math.random() > 0.7 ? "brain" : "dot",
      });
    }

    function draw() {
      rafRef.current = requestAnimationFrame(draw);
      tRef.current += 0.01;
      const t = tRef.current;
      ctx.fillStyle = "rgba(4,6,14,0.88)";
      ctx.fillRect(0, 0, W, H);

      for (const n of nodes) {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > W) n.vx *= -1;
        if (n.y < 0 || n.y > H) n.vy *= -1;
      }

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 80) {
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = `rgba(226,18,39,${(1 - dist / 80) * 0.12})`;
            ctx.lineWidth = 0.5; ctx.stroke();
          }
        }
      }

      for (const n of nodes) {
        const pulse = Math.sin(t * 3 + n.x * 0.05) * 0.5 + 0.5;
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r + pulse * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = n.color + "99"; ctx.fill();
      }

      // Central holographic text effect
      const cx = W / 2, cy = H / 2;
      const scanY = (Math.sin(t * 1.5) * 0.5 + 0.5) * H;
      const sg = ctx.createLinearGradient(0, scanY - 2, 0, scanY + 2);
      sg.addColorStop(0, "rgba(226,18,39,0)");
      sg.addColorStop(0.5, "rgba(226,18,39,0.15)");
      sg.addColorStop(1, "rgba(226,18,39,0)");
      ctx.fillStyle = sg;
      ctx.fillRect(0, scanY - 2, W, 4);

      // Hexagonal patterns
      for (let hx = 0; hx < 5; hx++) {
        const px = cx - 150 + hx * 75 + Math.sin(t + hx) * 3;
        const py = cy + Math.cos(t * 0.7 + hx) * 8;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
          const r = 18 + Math.sin(t * 2 + hx) * 2;
          const x = px + Math.cos(a) * r, y = py + Math.sin(a) * r;
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle = `rgba(167,139,250,${0.08 + Math.sin(t + hx) * 0.04})`;
        ctx.lineWidth = 0.8; ctx.stroke();
      }

      const g = ctx.createLinearGradient(cx - 200, 0, cx + 200, 0);
      g.addColorStop(0, "rgba(226,18,39,0)");
      g.addColorStop(0.5, "rgba(226,18,39,0.6)");
      g.addColorStop(1, "rgba(226,18,39,0)");
      ctx.beginPath(); ctx.moveTo(cx - 200, H - 1); ctx.lineTo(cx + 200, H - 1);
      ctx.strokeStyle = g; ctx.lineWidth = 1; ctx.stroke();
    }

    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <div className="relative w-full overflow-hidden" style={{ height: 120 }}>
      <canvas ref={canvasRef} style={{ width: "100%", height: 120, display: "block" }} />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 pointer-events-none">
        <div className="flex items-center gap-3">
          <Brain className="w-7 h-7" style={{ color: "#e21227", filter: "drop-shadow(0 0 8px #e21227)" }} />
          <h2 className="text-2xl font-black tracking-widest"
            style={{ color: "#fff", textShadow: "0 0 20px rgba(226,18,39,0.8), 0 0 40px rgba(226,18,39,0.4)" }}>
            PERSONA MANAGER
          </h2>
          <Brain className="w-7 h-7" style={{ color: "#e21227", filter: "drop-shadow(0 0 8px #e21227)" }} />
        </div>
        <p className="text-[10px] font-mono tracking-[0.4em]" style={{ color: "rgba(167,139,250,0.7)" }}>
          IDENTITY MATRIX · QUANTUM COGNITION LAYER
        </p>
      </div>
    </div>
  );
}

function PersonaCard({
  persona, isActive, onActivate, onEdit, onDelete, isCustom,
}: {
  persona: PersonaPreset | CustomPersona;
  isActive: boolean;
  onActivate: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  isCustom?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const Icon = "icon" in persona ? persona.icon : Brain;
  const catColor = CATEGORY_META[persona.category]?.color ?? "#6366f1";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="rounded-2xl border overflow-hidden cursor-pointer transition-all"
      style={{
        background: isActive ? `${catColor}10` : "rgba(255,255,255,0.02)",
        borderColor: isActive ? `${catColor}55` : "rgba(255,255,255,0.06)",
        boxShadow: isActive ? `0 0 20px ${catColor}18` : "none",
      }}
      onClick={onActivate}
    >
      <div className="p-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${catColor}18`, border: `1px solid ${catColor}33` }}>
          <Icon className="w-4.5 h-4.5" style={{ color: catColor }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-black" style={{ color: isActive ? catColor : "rgba(255,255,255,0.85)" }}>
              {persona.nameAr || persona.name}
            </span>
            {"badge" in persona && persona.badge && (
              <span className="text-[7px] font-black px-1 rounded"
                style={{ background: `${catColor}22`, color: catColor }}>
                {persona.badge}
              </span>
            )}
            {isCustom && (
              <span className="text-[7px] font-black px-1 rounded bg-violet-500/20 text-violet-400">CUSTOM</span>
            )}
            <span className="text-[7px] font-bold px-1 rounded ml-auto"
              style={{ background: `${catColor}15`, color: catColor, border: `1px solid ${catColor}30` }}>
              {CATEGORY_META[persona.category]?.label}
            </span>
          </div>
          <p className="text-[9px] text-muted-foreground/50 truncate mt-0.5">
            {"descAr" in persona ? persona.descAr : persona.desc}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {isActive && <Check className="w-3.5 h-3.5" style={{ color: catColor }} />}
          <button onClick={e => { e.stopPropagation(); setExpanded(p => !p); }}
            className="p-1 rounded-lg hover:bg-white/5 transition-colors">
            <ChevronDown className="w-3 h-3 text-muted-foreground/40 transition-transform"
              style={{ transform: expanded ? "rotate(180deg)" : "none" }} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-3 pb-3 space-y-2 border-t" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
              {"prompt" in persona && persona.prompt && (
                <div className="mt-2">
                  <p className="text-[8px] font-black text-muted-foreground/40 mb-1">SYSTEM PROMPT</p>
                  <div className="bg-[#0d0d0d] rounded-xl p-2 border border-[#1f1f1f] max-h-24 overflow-y-auto">
                    <p className="text-[9px] font-mono text-muted-foreground/60 leading-relaxed whitespace-pre-wrap">
                      {persona.prompt.slice(0, 300)}{persona.prompt.length > 300 ? "..." : ""}
                    </p>
                  </div>
                </div>
              )}
              <div className="flex gap-1.5 pt-1">
                <button onClick={e => { e.stopPropagation(); onActivate(); }}
                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[9px] font-bold transition-all"
                  style={{ background: `${catColor}18`, border: `1px solid ${catColor}33`, color: catColor }}>
                  <Check className="w-3 h-3" />
                  {isActive ? "مفعّل" : "تفعيل"}
                </button>
                {onEdit && (
                  <button onClick={e => { e.stopPropagation(); onEdit(); }}
                    className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[9px] font-bold bg-white/5 border border-white/10 text-muted-foreground hover:text-foreground transition-all">
                    <Edit3 className="w-3 h-3" />
                    تعديل
                  </button>
                )}
                {onDelete && (
                  <button onClick={e => { e.stopPropagation(); onDelete(); }}
                    className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[9px] font-bold bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all">
                    <Trash2 className="w-3 h-3" />
                    حذف
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

type EditorState = { open: boolean; editingId?: string; name: string; nameAr: string; desc: string; color: string; category: string; prompt: string };
const EMPTY_EDITOR: EditorState = { open: false, name: "", nameAr: "", desc: "", color: "#e21227", category: "general", prompt: "" };

export function PersonaManagerModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, dispatch } = useStore();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [customPersonas, setCustomPersonas] = useState<CustomPersona[]>(loadCustomPersonas);
  const [editor, setEditor] = useState<EditorState>(EMPTY_EDITOR);
  const [activePreset, setActivePreset] = useState<string>(
    () => localStorage.getItem("mr7-active-persona-preset") || "default"
  );

  const allPresets: (PersonaPreset | CustomPersona)[] = [
    ...PERSONA_PRESETS,
    ...customPersonas.map(cp => ({ ...cp, icon: Brain } as unknown as PersonaPreset)),
  ];

  const filtered = allPresets.filter(p => {
    const matchCat = catFilter === "all" || p.category === catFilter;
    const q = search.toLowerCase();
    const matchQ = !q || p.name.toLowerCase().includes(q) ||
      ("nameAr" in p ? p.nameAr.toLowerCase().includes(q) : false) ||
      p.desc.toLowerCase().includes(q);
    return matchCat && matchQ;
  });

  const activate = useCallback((id: string) => {
    setActivePreset(id);
    localStorage.setItem("mr7-active-persona-preset", id);
    const preset = allPresets.find(p => p.id === id);
    const promptText = (preset && "prompt" in preset && preset.prompt) ? preset.prompt : "";
    dispatch({ type: "SET_CUSTOM_INSTRUCTIONS", text: promptText });
    if (promptText) {
      localStorage.setItem("mr7-custom-system-prompt", promptText);
    } else {
      localStorage.removeItem("mr7-custom-system-prompt");
    }
    const nameLabel = preset ? (preset.nameAr || preset.name) : id;
    toast({ description: `تم تفعيل: ${nameLabel}`, duration: 2000 });
  }, [allPresets, dispatch, toast]);

  const openEditor = (cp?: CustomPersona) => {
    if (cp) {
      setEditor({ open: true, editingId: cp.id, name: cp.name, nameAr: cp.nameAr, desc: cp.desc, color: cp.color, category: cp.category, prompt: cp.prompt });
    } else {
      setEditor({ ...EMPTY_EDITOR, open: true });
    }
  };

  const saveEditor = () => {
    if (!editor.name.trim()) return;
    const updated = [...customPersonas];
    if (editor.editingId) {
      const idx = updated.findIndex(p => p.id === editor.editingId);
      if (idx !== -1) updated[idx] = { ...updated[idx], name: editor.name, nameAr: editor.nameAr, desc: editor.desc, color: editor.color, category: editor.category, prompt: editor.prompt };
    } else {
      updated.push({ id: `custom-${Date.now()}`, name: editor.name, nameAr: editor.nameAr || editor.name, desc: editor.desc, color: editor.color, category: editor.category, prompt: editor.prompt, createdAt: Date.now() });
    }
    saveCustomPersonas(updated);
    setCustomPersonas(updated);
    setEditor(EMPTY_EDITOR);
    toast({ description: "تم حفظ الشخصية", duration: 2000 });
  };

  const deleteCustom = (id: string) => {
    const updated = customPersonas.filter(p => p.id !== id);
    saveCustomPersonas(updated);
    setCustomPersonas(updated);
    if (activePreset === id) setActivePreset("default");
  };

  const exportAll = () => {
    const data = JSON.stringify({ presets: PERSONA_PRESETS.map(p => ({ id: p.id, name: p.name, nameAr: p.nameAr, desc: p.desc, category: p.category, prompt: p.prompt })), custom: customPersonas }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "mr7-personas.json"; a.click();
    URL.revokeObjectURL(url);
    toast({ description: "تم تصدير الشخصيات", duration: 2000 });
  };

  const cats = ["all", ...Object.keys(CATEGORY_META)];

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(12px)" }}
          onClick={e => e.target === e.currentTarget && onClose()}>
          <motion.div initial={{ scale: 0.92, y: 24 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 24 }}
            className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl border overflow-hidden"
            style={{ background: "rgba(8,8,12,0.99)", borderColor: "rgba(226,18,39,0.3)", boxShadow: "0 0 80px rgba(226,18,39,0.15), 0 0 160px rgba(0,0,0,0.8)" }}>

            <HolographicHeader />

            {/* Controls bar */}
            <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/30" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="بحث في الشخصيات..."
                  className="w-full bg-[#0d0d0d] border border-[#1f1f1f] focus:border-[rgba(226,18,39,0.4)] rounded-xl pl-9 pr-3 py-1.5 text-[11px] outline-none placeholder:text-muted-foreground/20 transition-colors" />
              </div>

              {/* Category filters */}
              <div className="flex items-center gap-1">
                {cats.map(cat => {
                  const meta = cat === "all" ? null : CATEGORY_META[cat];
                  return (
                    <button key={cat} onClick={() => setCatFilter(cat)}
                      className="px-2.5 py-1.5 rounded-xl text-[9px] font-bold border transition-all"
                      style={{
                        background: catFilter === cat ? `${meta?.color ?? "#e21227"}18` : "rgba(255,255,255,0.03)",
                        borderColor: catFilter === cat ? `${meta?.color ?? "#e21227"}44` : "rgba(255,255,255,0.07)",
                        color: catFilter === cat ? meta?.color ?? "#e21227" : "rgba(255,255,255,0.4)",
                      }}>
                      {cat === "all" ? "الكل" : meta?.label}
                    </button>
                  );
                })}
              </div>

              {/* View mode */}
              <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                {([["list", List], ["grid", Grid]] as const).map(([v, Icon]) => (
                  <button key={v} onClick={() => setViewMode(v)}
                    className="p-1.5 rounded-lg transition-all"
                    style={{ background: viewMode === v ? "rgba(226,18,39,0.2)" : "transparent", color: viewMode === v ? "#e21227" : "rgba(255,255,255,0.3)" }}>
                    <Icon className="w-3.5 h-3.5" />
                  </button>
                ))}
              </div>

              <button onClick={() => openEditor()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all"
                style={{ background: "rgba(226,18,39,0.15)", border: "1px solid rgba(226,18,39,0.3)", color: "#e21227" }}>
                <Plus className="w-3.5 h-3.5" />
                شخصية جديدة
              </button>

              <button onClick={exportAll}
                className="p-2 rounded-xl border border-[#2a2a2a] text-muted-foreground hover:text-foreground transition-colors">
                <Download className="w-3.5 h-3.5" />
              </button>

              <button onClick={onClose}
                className="p-2 rounded-xl border border-[#2a2a2a] text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Stats bar */}
            <div className="flex items-center gap-4 px-4 py-2 border-b" style={{ background: "rgba(226,18,39,0.03)", borderColor: "rgba(255,255,255,0.04)" }}>
              {[
                { label: "إجمالي الشخصيات", val: allPresets.length, color: "#e21227" },
                { label: "مخصص", val: customPersonas.length, color: "#a78bfa" },
                { label: "معروض", val: filtered.length, color: "#22c55e" },
                { label: "نشط", val: activePreset ? 1 : 0, color: "#f59e0b" },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
                  <span className="text-[9px] font-bold" style={{ color: s.color }}>{s.val}</span>
                  <span className="text-[8px] text-muted-foreground/40">{s.label}</span>
                </div>
              ))}
              <div className="ml-auto flex items-center gap-1.5">
                <Activity className="w-3 h-3" style={{ color: "rgba(226,18,39,0.5)" }} />
                <span className="text-[9px] text-muted-foreground/40">نشط الآن:</span>
                <span className="text-[9px] font-bold" style={{ color: "#e21227" }}>
                  {allPresets.find(p => p.id === activePreset)?.name ?? "—"}
                </span>
              </div>
            </div>

            {/* Main content */}
            <div className="flex-1 overflow-y-auto p-4" style={{ scrollbarWidth: "thin" }}>
              <AnimatePresence mode="wait">
                {editor.open ? (
                  <motion.div key="editor" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                    className="space-y-4 max-w-2xl mx-auto">
                    <div className="flex items-center gap-2 mb-2">
                      <Edit3 className="w-4 h-4" style={{ color: "#a78bfa" }} />
                      <span className="text-sm font-black">{editor.editingId ? "تعديل الشخصية" : "شخصية جديدة"}</span>
                      <button onClick={() => setEditor(EMPTY_EDITOR)} className="ml-auto p-1.5 rounded-lg hover:bg-white/5">
                        <X className="w-3.5 h-3.5 text-muted-foreground/50" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: "الاسم بالإنجليزي", key: "name", placeholder: "KaliHacker Elite" },
                        { label: "الاسم بالعربي", key: "nameAr", placeholder: "نخبة كالي هاكر" },
                      ].map(f => (
                        <div key={f.key} className="space-y-1">
                          <label className="text-[9px] font-black text-muted-foreground/50">{f.label}</label>
                          <input value={editor[f.key as "name"]}
                            onChange={e => setEditor(p => ({ ...p, [f.key]: e.target.value }))}
                            placeholder={f.placeholder}
                            className="w-full bg-[#0d0d0d] border border-[#1f1f1f] focus:border-[rgba(167,139,250,0.4)] rounded-xl px-3 py-2 text-[11px] outline-none transition-colors" />
                        </div>
                      ))}
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-muted-foreground/50">الوصف</label>
                      <input value={editor.desc} onChange={e => setEditor(p => ({ ...p, desc: e.target.value }))}
                        placeholder="وصف مختصر للشخصية..."
                        className="w-full bg-[#0d0d0d] border border-[#1f1f1f] focus:border-[rgba(167,139,250,0.4)] rounded-xl px-3 py-2 text-[11px] outline-none transition-colors" />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-muted-foreground/50">الفئة</label>
                        <select value={editor.category} onChange={e => setEditor(p => ({ ...p, category: e.target.value }))}
                          className="w-full bg-[#0d0d0d] border border-[#1f1f1f] focus:border-[rgba(167,139,250,0.4)] rounded-xl px-3 py-2 text-[11px] outline-none transition-colors">
                          {Object.entries(CATEGORY_META).map(([k, v]) => (
                            <option key={k} value={k}>{v.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-muted-foreground/50">اللون</label>
                        <div className="flex items-center gap-2">
                          <input type="color" value={editor.color} onChange={e => setEditor(p => ({ ...p, color: e.target.value }))}
                            className="w-10 h-9 rounded-xl border border-[#1f1f1f] bg-[#0d0d0d] cursor-pointer" />
                          <div className="flex-1 h-9 rounded-xl border border-[#1f1f1f] px-3 flex items-center">
                            <span className="text-[11px] font-mono" style={{ color: editor.color }}>{editor.color}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-muted-foreground/50">نظام الشخصية (System Prompt)</label>
                      <textarea value={editor.prompt} onChange={e => setEditor(p => ({ ...p, prompt: e.target.value }))}
                        placeholder="اكتب تعليمات الشخصية هنا... مثال: أنت خبير أمن سيبراني متخصص في اختبار الاختراق..."
                        rows={6} className="w-full bg-[#0d0d0d] border border-[#1f1f1f] focus:border-[rgba(167,139,250,0.4)] rounded-xl px-3 py-2 text-[11px] outline-none resize-none transition-colors font-mono leading-relaxed" />
                    </div>

                    <div className="flex gap-2">
                      <motion.button onClick={saveEditor}
                        disabled={!editor.name.trim()}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-bold disabled:opacity-40 transition-all"
                        style={{ background: "rgba(167,139,250,0.15)", border: "1px solid rgba(167,139,250,0.3)", color: "#a78bfa" }}
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Save className="w-3.5 h-3.5" />
                        حفظ الشخصية
                      </motion.button>
                      <button onClick={() => setEditor(EMPTY_EDITOR)}
                        className="px-4 py-2 rounded-xl text-[11px] font-bold border border-[#2a2a2a] text-muted-foreground hover:text-foreground transition-colors">
                        إلغاء
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className={viewMode === "grid" ? "grid grid-cols-2 gap-2" : "space-y-2"}>
                    {filtered.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground/30">
                        <Brain className="w-10 h-10 mb-3" />
                        <p className="text-sm">لا توجد شخصيات</p>
                        <p className="text-xs mt-1">جرّب فلتراً مختلفاً أو أضف شخصية جديدة</p>
                      </div>
                    ) : (
                      filtered.map(p => {
                        const isCustom = customPersonas.some(c => c.id === p.id);
                        return (
                          <PersonaCard
                            key={p.id}
                            persona={p}
                            isActive={activePreset === p.id}
                            onActivate={() => activate(p.id)}
                            isCustom={isCustom}
                            onEdit={isCustom ? () => openEditor(p as CustomPersona) : undefined}
                            onDelete={isCustom ? () => deleteCustom(p.id) : undefined}
                          />
                        );
                      })
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: "rgba(255,255,255,0.05)", background: "rgba(0,0,0,0.4)" }}>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#22c55e" }} />
                <span className="text-[9px] text-muted-foreground/40">
                  {allPresets.length} شخصية متاحة · {customPersonas.length} مخصص · نظام MASTERO
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => {
                  setActivePreset("default");
                  localStorage.removeItem("mr7-active-persona-preset");
                  dispatch({ type: "SET_CUSTOM_INSTRUCTIONS", text: "" });
                  localStorage.removeItem("mr7-custom-system-prompt");
                  toast({ description: "تمت إعادة الضبط للافتراضي", duration: 2000 });
                }} className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[9px] font-bold border border-[#2a2a2a] text-muted-foreground hover:text-foreground transition-colors">
                  <RefreshCw className="w-3 h-3" />
                  إعادة ضبط
                </button>
                <button onClick={onClose}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all"
                  style={{ background: "rgba(226,18,39,0.15)", border: "1px solid rgba(226,18,39,0.3)", color: "#e21227" }}>
                  إغلاق
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
