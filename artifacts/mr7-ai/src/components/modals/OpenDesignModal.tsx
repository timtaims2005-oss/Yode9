import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Palette, Square, Circle, Type, Move, ZoomIn, ZoomOut,
  Undo2, Redo2, Download, Share2, Eye, EyeOff, Lock, Unlock,
  Plus, AlignCenter, Grid3X3, Wand2, Image, Pen, MousePointer2,
} from "lucide-react";

const B = "#60a5fa";
const Bg = (n: number) => `rgba(96,165,250,${n})`;

interface OpenDesignModalProps { open: boolean; onOpenChange: (v: boolean) => void; }

type Tool = "select" | "rect" | "circle" | "text" | "pen" | "image";
type Tab  = "layers" | "assets";

interface Layer { id: string; name: string; type: string; visible: boolean; locked: boolean; }

const SAMPLE_LAYERS: Layer[] = [
  { id: "l1", name: "Header / Navigation", type: "group",  visible: true,  locked: false },
  { id: "l2", name: "Hero Section",        type: "group",  visible: true,  locked: false },
  { id: "l3", name: "Background Gradient", type: "rect",   visible: true,  locked: true  },
  { id: "l4", name: "Hero Heading",        type: "text",   visible: true,  locked: false },
  { id: "l5", name: "CTA Button",          type: "group",  visible: true,  locked: false },
  { id: "l6", name: "Hero Image",          type: "image",  visible: true,  locked: false },
  { id: "l7", name: "Feature Cards",       type: "group",  visible: true,  locked: false },
  { id: "l8", name: "Footer",              type: "group",  visible: false, locked: false },
];

const COLORS = ["#60a5fa","#818cf8","#a78bfa","#f472b6","#f87171","#fb923c","#fbbf24","#4ade80","#2dd4bf","#22d3ee","#38bdf8","#ffffff","#1e293b","#374151"];

const COMPONENTS = [
  { name: "Button Primary",   preview: "🔵" },
  { name: "Button Secondary", preview: "⚪" },
  { name: "Card",             preview: "🃏" },
  { name: "Input Field",      preview: "📝" },
  { name: "Modal",            preview: "🪟" },
  { name: "Navigation",       preview: "📎" },
  { name: "Avatar",           preview: "👤" },
  { name: "Badge",            preview: "🏷️" },
  { name: "Dropdown",         preview: "▼" },
  { name: "Tooltip",          preview: "💬" },
  { name: "Progress Bar",     preview: "▓" },
  { name: "Toggle",           preview: "🔘" },
];

const TOOLS: { id: Tool; icon: typeof Square; label: string; key: string }[] = [
  { id: "select", icon: MousePointer2, label: "Select",    key: "V" },
  { id: "rect",   icon: Square,        label: "Rectangle", key: "R" },
  { id: "circle", icon: Circle,        label: "Ellipse",   key: "E" },
  { id: "text",   icon: Type,          label: "Text",      key: "T" },
  { id: "pen",    icon: Pen,           label: "Pen Tool",  key: "P" },
  { id: "image",  icon: Image,         label: "Image",     key: "I" },
];

function CanvasArea({ activeTool }: { activeTool: Tool }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [shapes, setShapes] = useState<{ x: number; y: number; w: number; h: number; color: string; type: "rect" | "circle" }[]>([
    { x: 60,  y: 40,  w: 420, h: 60,  color: "#1e293b", type: "rect"   },
    { x: 60,  y: 120, w: 420, h: 200, color: "#0f172a", type: "rect"   },
    { x: 80,  y: 140, w: 200, h: 30,  color: B,         type: "rect"   },
    { x: 80,  y: 180, w: 160, h: 50,  color: "#4ade80", type: "rect"   },
    { x: 300, y: 130, w: 160, h: 160, color: "#1e3a5f", type: "circle" },
  ]);
  const [drawing, setDrawing] = useState(false);
  const [start, setStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "rgba(255,255,255,0.035)"; ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 20) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke(); }
    for (let y = 0; y < canvas.height; y += 20) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke(); }
    shapes.forEach(s => {
      ctx.fillStyle = s.color;
      if (s.type === "rect") { ctx.beginPath(); ctx.roundRect(s.x, s.y, s.w, s.h, 4); ctx.fill(); }
      else { ctx.beginPath(); ctx.ellipse(s.x + s.w / 2, s.y + s.h / 2, s.w / 2, s.h / 2, 0, 0, Math.PI * 2); ctx.fill(); }
    });
  }, [shapes]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool === "select") return;
    const rect = e.currentTarget.getBoundingClientRect();
    setStart({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setDrawing(true);
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawing || activeTool === "select") return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ex = e.clientX - rect.left; const ey = e.clientY - rect.top;
    const w = Math.abs(ex - start.x); const h = Math.abs(ey - start.y);
    if (w < 5 && h < 5) { setDrawing(false); return; }
    setShapes(s => [...s, { x: Math.min(start.x, ex), y: Math.min(start.y, ey), w, h, color: B, type: activeTool === "circle" ? "circle" : "rect" }]);
    setDrawing(false);
  };

  return (
    <canvas ref={canvasRef} width={540} height={380} onMouseDown={handleMouseDown} onMouseUp={handleMouseUp}
      className="w-full h-full object-contain" style={{ cursor: activeTool === "select" ? "default" : "crosshair" }} />
  );
}

export function OpenDesignModal({ open, onOpenChange }: OpenDesignModalProps) {
  const [activeTool, setActiveTool] = useState<Tool>("select");
  const [tab, setTab]               = useState<Tab>("layers");
  const [layers, setLayers]         = useState(SAMPLE_LAYERS);
  const [zoom, setZoom]             = useState(100);
  const [selectedColor, setSelectedColor] = useState(B);

  if (!open) return null;

  const toggleVisible = (id: string) => setLayers(ls => ls.map(l => l.id === id ? { ...l, visible: !l.visible } : l));
  const toggleLocked  = (id: string) => setLayers(ls => ls.map(l => l.id === id ? { ...l, locked: !l.locked } : l));

  const PanelTabBtn = ({ id, label }: { id: Tab; label: string }) => (
    <button
      onClick={() => setTab(id)}
      className="flex-1 py-1.5 rounded-lg text-[10px] font-black font-mono tracking-wide transition-all"
      style={{
        background: tab === id ? Bg(0.14) : "transparent",
        border: `1px solid ${tab === id ? Bg(0.38) : "transparent"}`,
        color: tab === id ? B : "rgba(255,255,255,0.38)",
      }}
    >
      {label}
    </button>
  );

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.88)", backdropFilter: "blur(20px)" }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      >
        <motion.div
          className="relative flex flex-col w-full h-full max-w-5xl max-h-[90vh] rounded-2xl overflow-hidden"
          style={{
            background: "linear-gradient(160deg, rgba(8,10,20,0.97) 0%, rgba(4,6,14,0.98) 100%)",
            backdropFilter: "blur(40px)",
            border: `1px solid ${Bg(0.22)}`,
            boxShadow: `0 0 80px ${Bg(0.1)}, 0 40px 80px rgba(0,0,0,0.6), inset 0 1px 0 ${Bg(0.12)}`,
          }}
          initial={{ scale: 0.94, y: 24 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
        >
          {/* Top accent */}
          <div className="absolute inset-x-0 top-0 h-px z-20" style={{ background: `linear-gradient(90deg, transparent, ${B}, transparent)` }} />

          {/* ── TOPBAR ── */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ borderColor: Bg(0.12), background: "rgba(0,0,0,0.45)" }}>
            {/* Brand */}
            <div className="flex items-center gap-3">
              <motion.div
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: `linear-gradient(135deg, ${Bg(0.22)}, ${Bg(0.08)})`, border: `1px solid ${Bg(0.38)}` }}
                animate={{ boxShadow: [`0 0 8px ${Bg(0.2)}`, `0 0 20px ${Bg(0.45)}`, `0 0 8px ${Bg(0.2)}`] }}
                transition={{ duration: 2.5, repeat: Infinity }}
              >
                <Palette size={14} style={{ color: B, filter: `drop-shadow(0 0 5px ${Bg(0.8)})` }} />
              </motion.div>
              <div>
                <span className="text-[12px] font-black font-mono" style={{ color: "rgba(255,255,255,0.85)" }}>OPEN DESIGN</span>
                <span className="ml-2 text-[9px] font-mono" style={{ color: "rgba(255,255,255,0.25)" }}>v0.15.1</span>
              </div>
            </div>

            {/* Tool bar */}
            <div className="flex items-center gap-0.5 px-2 py-1.5 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              {TOOLS.map(t => {
                const Icon = t.icon;
                const active = activeTool === t.id;
                return (
                  <button key={t.id} onClick={() => setActiveTool(t.id)} title={`${t.label} (${t.key})`}
                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                    style={{ background: active ? Bg(0.16) : "transparent", border: `1px solid ${active ? Bg(0.4) : "transparent"}` }}>
                    <Icon size={13} style={{ color: active ? B : "rgba(255,255,255,0.35)" }} />
                  </button>
                );
              })}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {[Undo2, Redo2].map((Icon, i) => (
                <button key={i} className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:bg-white/10"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <Icon size={13} style={{ color: "rgba(255,255,255,0.4)" }} />
                </button>
              ))}
              <motion.button whileHover={{ scale: 1.04 }} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold"
                style={{ background: Bg(0.12), border: `1px solid ${Bg(0.3)}`, color: B }}>
                <Share2 size={10} />Share
              </motion.button>
              <motion.button whileHover={{ scale: 1.04 }} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold"
                style={{ background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.28)", color: "#4ade80" }}>
                <Download size={10} />Export
              </motion.button>
              <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }} onClick={() => onOpenChange(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <X size={13} style={{ color: "rgba(255,255,255,0.6)" }} />
              </motion.button>
            </div>
          </div>

          {/* ── MAIN AREA ── */}
          <div className="flex flex-1 overflow-hidden">
            {/* Left panel */}
            <div className="w-52 flex-shrink-0 border-r flex flex-col" style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(6,6,14,0.8)" }}>
              <div className="flex items-center gap-1 p-2 border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                <PanelTabBtn id="layers" label="LAYERS" />
                <PanelTabBtn id="assets" label="ASSETS" />
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
                {tab === "layers" && SAMPLE_LAYERS.map((layer, i) => (
                  <motion.div key={layer.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer group transition-all"
                    style={{ background: "rgba(255,255,255,0.03)" }}
                    whileHover={{ background: "rgba(255,255,255,0.06)" }}
                  >
                    <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: Bg(0.35), border: `1px solid ${Bg(0.5)}` }} />
                    <span className="flex-1 text-[11px] font-mono truncate" style={{ color: layer.visible ? "rgba(255,255,255,0.65)" : "rgba(255,255,255,0.2)" }}>{layer.name}</span>
                    <button onClick={() => toggleVisible(layer.id)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                      {layer.visible ? <Eye size={10} style={{ color: "rgba(255,255,255,0.4)" }} /> : <EyeOff size={10} style={{ color: "rgba(255,255,255,0.2)" }} />}
                    </button>
                    <button onClick={() => toggleLocked(layer.id)}>
                      {layer.locked ? <Lock size={10} style={{ color: "rgba(255,255,255,0.4)" }} /> : <Unlock size={10} style={{ color: "rgba(255,255,255,0.2)" }} />}
                    </button>
                  </motion.div>
                ))}
                {tab === "assets" && (
                  <div className="space-y-0.5 pt-1">
                    <div className="text-[8.5px] font-black font-mono tracking-widest px-2 pb-1.5" style={{ color: "rgba(255,255,255,0.28)" }}>COMPONENTS</div>
                    {COMPONENTS.map(c => (
                      <div key={c.name} className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-all"
                        style={{ background: "rgba(255,255,255,0.03)" }}>
                        <span className="text-sm leading-none">{c.preview}</span>
                        <span className="text-[10px] font-mono" style={{ color: "rgba(255,255,255,0.55)" }}>{c.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Canvas area */}
            <div className="flex-1 relative overflow-hidden flex flex-col" style={{ background: "rgba(10,12,22,0.6)" }}>
              {/* Canvas toolbar */}
              <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(0,0,0,0.35)" }}>
                <div className="flex items-center gap-2">
                  <button onClick={() => setZoom(z => Math.max(25, z - 25))} className="w-6 h-6 rounded-lg flex items-center justify-center transition-all hover:bg-white/10"
                    style={{ background: "rgba(255,255,255,0.04)" }}>
                    <ZoomOut size={11} style={{ color: "rgba(255,255,255,0.45)" }} />
                  </button>
                  <span className="text-[11px] font-mono w-12 text-center" style={{ color: "rgba(255,255,255,0.5)" }}>{zoom}%</span>
                  <button onClick={() => setZoom(z => Math.min(400, z + 25))} className="w-6 h-6 rounded-lg flex items-center justify-center transition-all hover:bg-white/10"
                    style={{ background: "rgba(255,255,255,0.04)" }}>
                    <ZoomIn size={11} style={{ color: "rgba(255,255,255,0.45)" }} />
                  </button>
                </div>
                <span className="text-[10px] font-mono" style={{ color: "rgba(255,255,255,0.22)" }}>1440 × 960</span>
                <div className="flex items-center gap-1.5">
                  <Grid3X3 size={12} style={{ color: "rgba(255,255,255,0.3)" }} />
                  <AlignCenter size={12} style={{ color: "rgba(255,255,255,0.3)" }} />
                </div>
              </div>

              <div className="flex-1 overflow-auto flex items-center justify-center p-6">
                <div className="rounded-xl overflow-hidden shadow-2xl"
                  style={{ transform: `scale(${zoom / 100})`, transformOrigin: "center center", border: "1px solid rgba(255,255,255,0.1)", background: "#0d1117" }}>
                  <CanvasArea activeTool={activeTool} />
                </div>
              </div>
            </div>

            {/* Right panel */}
            <div className="w-52 flex-shrink-0 border-l flex flex-col" style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(6,6,14,0.8)" }}>
              <div className="px-3 py-2.5 border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                <span className="text-[8.5px] font-black font-mono tracking-widest" style={{ color: "rgba(255,255,255,0.28)" }}>PROPERTIES</span>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-4">
                {/* Position & size */}
                <div>
                  <div className="text-[8px] font-black font-mono tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.25)" }}>POSITION & SIZE</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[["X","120"],["Y","80"],["W","400"],["H","56"]].map(([l,v]) => (
                      <div key={l} className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                        <span className="text-[9px] font-mono w-4 flex-shrink-0" style={{ color: "rgba(255,255,255,0.3)" }}>{l}</span>
                        <input defaultValue={v} className="flex-1 bg-transparent outline-none text-[11px] font-mono min-w-0" style={{ color: "rgba(255,255,255,0.75)" }} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Fill */}
                <div>
                  <div className="text-[8px] font-black font-mono tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.25)" }}>FILL</div>
                  <div className="flex flex-wrap gap-1.5">
                    {COLORS.map(c => (
                      <button key={c} onClick={() => setSelectedColor(c)}
                        className="w-6 h-6 rounded-lg transition-all hover:scale-110"
                        style={{ background: c, border: `2px solid ${selectedColor === c ? "rgba(255,255,255,0.9)" : "transparent"}`, boxShadow: selectedColor === c ? `0 0 8px ${c}80` : "none" }} />
                    ))}
                  </div>
                </div>

                {/* Typography */}
                <div>
                  <div className="text-[8px] font-black font-mono tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.25)" }}>TYPOGRAPHY</div>
                  <div className="space-y-1.5">
                    <select className="w-full text-[10px] font-mono px-2 py-1.5 rounded-lg outline-none"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" }}>
                      <option>Inter</option><option>Roboto</option><option>Geist Mono</option>
                    </select>
                    <div className="flex gap-1.5">
                      {["B","I","U"].map(f => (
                        <button key={f} className="flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all hover:bg-white/10"
                          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.45)" }}>
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* AI Assist */}
                <div>
                  <div className="text-[8px] font-black font-mono tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.25)" }}>AI ASSIST</div>
                  <motion.button
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-bold"
                    style={{ background: Bg(0.1), border: `1px solid ${Bg(0.28)}`, color: B }}>
                    <Wand2 size={11} />Generate Design
                  </motion.button>
                </div>
              </div>
            </div>
          </div>

          {/* ── STATUS BAR ── */}
          <div className="px-4 py-2 border-t flex items-center justify-between" style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(0,0,0,0.45)" }}>
            <span className="text-[9px] font-mono" style={{ color: "rgba(255,255,255,0.22)" }}>Open Design · Open-Source Figma Alternative · v0.15.1</span>
            <span className="text-[9px] font-mono" style={{ color: "rgba(255,255,255,0.28)" }}>Untitled Design · {layers.length} layers</span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
