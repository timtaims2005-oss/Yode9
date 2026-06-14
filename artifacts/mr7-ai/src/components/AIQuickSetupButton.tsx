import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore, ProviderName } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";

const KEY_PREFIX  = "mr7-ai-p-key-";
const URL_PREFIX  = "mr7-ai-p-url-";

interface ProviderDef {
  id: string;
  name: string;
  shortName: string;
  color: string;
  baseURL: string;
  providerName: ProviderName;
  models: { id: string; label: string; tag: string }[];
  category: string;
  requiresKey: boolean;
  badge?: string;
}

const ALL_PROVIDERS: ProviderDef[] = [
  {
    id: "groq", name: "Groq", shortName: "GROQ", color: "#f59e0b",
    baseURL: "https://api.groq.com/openai/v1", providerName: "groq",
    category: "سرعة فائقة", requiresKey: true, badge: "FASTEST",
    models: [
      { id: "llama-3.3-70b-versatile",  label: "Llama 3.3 70B",   tag: "BEST" },
      { id: "llama-3.1-8b-instant",     label: "Llama 3.1 8B",    tag: "FAST" },
      { id: "mixtral-8x7b-32768",       label: "Mixtral 8×7B",    tag: "MIX"  },
      { id: "gemma2-9b-it",             label: "Gemma 2 9B",      tag: "LITE" },
    ],
  },
  {
    id: "openai", name: "OpenAI", shortName: "OAI", color: "#10b981",
    baseURL: "https://api.openai.com/v1", providerName: "openai",
    category: "متعدد الأغراض", requiresKey: true, badge: "GPT-4o",
    models: [
      { id: "gpt-4o",         label: "GPT-4o",         tag: "BEST" },
      { id: "gpt-4o-mini",    label: "GPT-4o Mini",    tag: "FAST" },
      { id: "gpt-4-turbo",    label: "GPT-4 Turbo",    tag: "PRO"  },
      { id: "o1-mini",        label: "o1-mini",         tag: "THINK"},
    ],
  },
  {
    id: "anthropic", name: "Anthropic", shortName: "CLO", color: "#f97316",
    baseURL: "https://api.anthropic.com/v1", providerName: "anthropic",
    category: "استدلال عميق", requiresKey: true, badge: "Claude",
    models: [
      { id: "claude-sonnet-4-5",      label: "Claude Sonnet 4.5",  tag: "BEST" },
      { id: "claude-3-5-haiku-latest",label: "Claude Haiku 3.5",   tag: "FAST" },
      { id: "claude-opus-4-5",        label: "Claude Opus 4.5",    tag: "MAX"  },
    ],
  },
  {
    id: "gemini", name: "Gemini", shortName: "GEM", color: "#3b82f6",
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai", providerName: "gemini",
    category: "متعدد الوسائط", requiresKey: true, badge: "2.5",
    models: [
      { id: "gemini-2.5-flash",          label: "Gemini 2.5 Flash",     tag: "BEST" },
      { id: "gemini-2.5-pro",            label: "Gemini 2.5 Pro",       tag: "PRO"  },
      { id: "gemini-2.0-flash",          label: "Gemini 2.0 Flash",     tag: "FAST" },
    ],
  },
  {
    id: "openrouter", name: "OpenRouter", shortName: "OR", color: "#8b5cf6",
    baseURL: "https://openrouter.ai/api/v1", providerName: "openrouter",
    category: "300+ نموذج", requiresKey: true, badge: "300+",
    models: [
      { id: "deepseek/deepseek-chat-v3-0324", label: "DeepSeek V3",       tag: "BEST" },
      { id: "anthropic/claude-sonnet-4-5",    label: "Claude Sonnet 4.5", tag: "PRO"  },
      { id: "meta-llama/llama-3.3-70b",       label: "Llama 3.3 70B",     tag: "OPEN" },
      { id: "google/gemini-flash-1.5",        label: "Gemini Flash 1.5",  tag: "FAST" },
    ],
  },
  {
    id: "deepseek", name: "DeepSeek", shortName: "DS", color: "#06b6d4",
    baseURL: "https://api.deepseek.com/v1", providerName: "custom",
    category: "استدلال", requiresKey: true,
    models: [
      { id: "deepseek-chat",    label: "DeepSeek V3",      tag: "BEST" },
      { id: "deepseek-reasoner",label: "DeepSeek R1",      tag: "THINK"},
    ],
  },
  {
    id: "xai", name: "xAI Grok", shortName: "GROK", color: "#22d3ee",
    baseURL: "https://api.x.ai/v1", providerName: "custom",
    category: "X.ai", requiresKey: true,
    models: [
      { id: "grok-3",      label: "Grok 3",      tag: "BEST" },
      { id: "grok-3-mini", label: "Grok 3 Mini", tag: "FAST" },
    ],
  },
  {
    id: "mistral", name: "Mistral AI", shortName: "MIS", color: "#ec4899",
    baseURL: "https://api.mistral.ai/v1", providerName: "custom",
    category: "أوروبي", requiresKey: true,
    models: [
      { id: "mistral-large-latest",  label: "Mistral Large",  tag: "BEST" },
      { id: "mistral-small-latest",  label: "Mistral Small",  tag: "FAST" },
    ],
  },
  {
    id: "perplexity", name: "Perplexity", shortName: "PP", color: "#22c55e",
    baseURL: "https://api.perplexity.ai", providerName: "custom",
    category: "بحث ويب", requiresKey: true,
    models: [
      { id: "sonar-pro",  label: "Sonar Pro",  tag: "BEST" },
      { id: "sonar",      label: "Sonar",      tag: "FAST" },
    ],
  },
  {
    id: "ollama", name: "Ollama", shortName: "OLL", color: "#10b981",
    baseURL: "http://localhost:11434/v1", providerName: "custom",
    category: "محلي", requiresKey: false, badge: "LOCAL",
    models: [
      { id: "llama3.2",     label: "Llama 3.2",   tag: "BEST" },
      { id: "mistral",      label: "Mistral",      tag: "MIX"  },
      { id: "deepseek-r1",  label: "DeepSeek R1", tag: "THINK"},
    ],
  },
  {
    id: "lmstudio", name: "LM Studio", shortName: "LMS", color: "#a78bfa",
    baseURL: "http://localhost:1234/v1", providerName: "custom",
    category: "محلي", requiresKey: false, badge: "LOCAL",
    models: [
      { id: "local-model", label: "النموذج المحلي", tag: "LOCAL" },
    ],
  },
];

type Phase = "idle" | "scanning" | "done" | "fail";

// ── 3D ORBITAL ATOM CANVAS ────────────────────────────────────────────────────
function NexusAtom({ phase, open }: { phase: Phase; open: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef(0);
  const tickRef   = useRef(0);
  const phaseRef  = useRef<Phase>(phase);
  const openRef   = useRef(open);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { openRef.current = open; }, [open]);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d", { alpha: true })!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    const DPR = Math.min(window.devicePixelRatio * 2, 4);
    const W = 52, H = 52;
    cv.width  = W * DPR;
    cv.height = H * DPR;
    ctx.scale(DPR, DPR);
    const cx = W / 2, cy = H / 2;

    const G = "rgba(0,255,136,";
    const C = "rgba(0,229,255,";
    const L = "rgba(134,255,0,";
    const W2 = "rgba(255,255,255,";

    // 24 particles across 3 rings (increased from 18)
    const particles = Array.from({ length: 24 }, (_, i) => {
      const ring = Math.floor(i / 8);
      return {
        angle: (i / 8) * Math.PI * 2 + ring * 0.6,
        speed: 0.016 + ring * 0.006,
        rx: 13 + ring * 5,
        tilt: 0.24 + ring * 0.28,
        col: ring === 0 ? G : ring === 1 ? C : L,
        size: 0.9 + ring * 0.35,
        trail: [] as { x: number; y: number }[],
      };
    });

    // Data ring sweep
    const dataNodes = Array.from({ length: 8 }, (_, i) => ({
      angle: (i / 8) * Math.PI * 2,
      r: 22,
    }));

    function draw() {
      rafRef.current = requestAnimationFrame(draw);
      tickRef.current++;
      const t = tickRef.current;
      const ph = phaseRef.current;
      const isOpen = openRef.current;
      ctx.clearRect(0, 0, W, H);

      // Enhanced ambient when open
      const ambR = isOpen ? 26 : 22;
      const ambA = isOpen ? 0.18 : 0.1;
      const amb = ctx.createRadialGradient(cx, cy, 0, cx, cy, ambR);
      amb.addColorStop(0, `rgba(0,255,136,${ambA})`);
      amb.addColorStop(0.5, `rgba(0,229,255,${ambA * 0.4})`);
      amb.addColorStop(1, "rgba(0,0,0,0)");
      ctx.beginPath(); ctx.arc(cx, cy, ambR, 0, Math.PI * 2);
      ctx.fillStyle = amb; ctx.fill();

      // Outer energy ring (new)
      if (isOpen) {
        const eRingR = 24 + Math.sin(t * 0.05) * 1.5;
        ctx.beginPath(); ctx.arc(cx, cy, eRingR, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0,255,136,${0.15 + Math.sin(t * 0.08) * 0.08})`;
        ctx.lineWidth = 0.8; ctx.stroke();
      }

      // Scanning sweep
      if (ph === "scanning") {
        const angle = (t * 0.065) % (Math.PI * 2);
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(angle);
        ctx.beginPath(); ctx.moveTo(0, 0);
        ctx.arc(0, 0, 23, -0.6, 0.6); ctx.closePath();
        const sw = ctx.createRadialGradient(0, 0, 0, 0, 0, 23);
        sw.addColorStop(0, "rgba(0,229,255,0.75)");
        sw.addColorStop(1, "rgba(0,229,255,0)");
        ctx.fillStyle = sw; ctx.fill(); ctx.restore();
      }

      // Data nodes (outer ring) — new feature
      if (isOpen || ph === "scanning") {
        dataNodes.forEach((n, i) => {
          const na = n.angle + t * 0.008;
          const nx = cx + Math.cos(na) * n.r;
          const ny = cy + Math.sin(na) * n.r * 0.35;
          const pulse = (Math.sin(t * 0.12 + i * 0.8) + 1) / 2;
          ctx.beginPath(); ctx.arc(nx, ny, 0.9 + pulse * 0.6, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(0,255,136,${0.3 + pulse * 0.5})`; ctx.fill();
        });
      }

      // 3 orbit ellipses
      const orbitDefs = [
        { rx: 13, tilt: 0.24, rot: t * 0.011, col: G },
        { rx: 18, tilt: 0.46, rot: -t * 0.008, col: C },
        { rx: 23, tilt: 0.64, rot: t * 0.006, col: L },
      ];
      orbitDefs.forEach(o => {
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(o.rot);
        ctx.setLineDash([2.5, 4.5]);
        ctx.beginPath(); ctx.ellipse(0, 0, o.rx, o.rx * o.tilt, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `${o.col}${isOpen ? 0.35 : 0.22})`;
        ctx.lineWidth = 0.85; ctx.stroke();
        ctx.setLineDash([]); ctx.restore();
      });

      // Particles + trails
      particles.forEach(p => {
        p.angle += p.speed * (ph === "scanning" ? 2.1 : isOpen ? 1.35 : 1);
        const px = cx + Math.cos(p.angle) * p.rx;
        const py = cy + Math.sin(p.angle) * p.rx * p.tilt;
        const depth = (Math.sin(p.angle) + 1) / 2;
        const alpha = 0.28 + depth * 0.72;

        p.trail.push({ x: px, y: py });
        if (p.trail.length > 8) p.trail.shift();
        p.trail.forEach((pt, ti) => {
          const ta = alpha * 0.16 * (ti / p.trail.length);
          const tr = p.size * 0.45 * (ti / p.trail.length);
          if (tr < 0.1) return;
          ctx.beginPath(); ctx.arc(pt.x, pt.y, tr, 0, Math.PI * 2);
          ctx.fillStyle = `${p.col}${ta})`; ctx.fill();
        });

        const gr = ctx.createRadialGradient(px, py, 0, px, py, p.size * 3.2);
        gr.addColorStop(0, `${p.col}${alpha})`);
        gr.addColorStop(0.4, `${p.col}${alpha * 0.3})`);
        gr.addColorStop(1, `${p.col}0)`);
        ctx.beginPath(); ctx.arc(px, py, p.size * 3.2, 0, Math.PI * 2);
        ctx.fillStyle = gr; ctx.fill();

        ctx.beginPath(); ctx.arc(px, py, Math.max(0.4, p.size * 0.65), 0, Math.PI * 2);
        ctx.fillStyle = `${W2}${alpha * 0.92})`; ctx.fill();
      });

      // Central nucleus
      const coreR = 5 + (ph === "scanning" ? Math.sin(t * 0.19) * 1.8 : isOpen ? Math.sin(t * 0.06) * 0.6 : 0);
      const cHalo = ctx.createRadialGradient(cx, cy, coreR * 0.5, cx, cy, coreR * 3.8);
      cHalo.addColorStop(0, "rgba(0,255,136,0.6)");
      cHalo.addColorStop(0.5, "rgba(0,255,136,0.15)");
      cHalo.addColorStop(1, "rgba(0,255,136,0)");
      ctx.beginPath(); ctx.arc(cx, cy, coreR * 3.8, 0, Math.PI * 2);
      ctx.fillStyle = cHalo; ctx.fill();

      const cBody = ctx.createRadialGradient(cx - coreR * 0.3, cy - coreR * 0.35, 0, cx, cy, coreR);
      cBody.addColorStop(0, "rgba(255,255,255,0.98)");
      cBody.addColorStop(0.3, "rgba(0,255,136,1)");
      cBody.addColorStop(0.7, "rgba(0,200,100,0.85)");
      cBody.addColorStop(1, "rgba(0,120,60,0.55)");
      ctx.beginPath(); ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
      ctx.fillStyle = cBody; ctx.fill();

      // Inner grid on nucleus
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, coreR, 0, Math.PI * 2); ctx.clip();
      ctx.beginPath(); ctx.ellipse(cx, cy, coreR, coreR * 0.28, 0, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(0,255,136,0.22)"; ctx.lineWidth = 0.5; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(cx, cy, coreR * 0.28, coreR, 0, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(0,255,136,0.15)"; ctx.lineWidth = 0.5; ctx.stroke();
      ctx.restore();

      // Done tick
      if (ph === "done") {
        ctx.strokeStyle = "#22c55e"; ctx.lineWidth = 2.3; ctx.lineCap = "round";
        ctx.shadowColor = "#22c55e"; ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(cx - 4.5, cy + 0.5); ctx.lineTo(cx - 0.8, cy + 4.2); ctx.lineTo(cx + 5.5, cy - 4.5);
        ctx.stroke(); ctx.shadowBlur = 0;
      }
      // Fail X
      if (ph === "fail") {
        ctx.strokeStyle = "#ef4444"; ctx.lineWidth = 2.1; ctx.lineCap = "round";
        ctx.shadowColor = "#ef4444"; ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(cx - 4, cy - 4); ctx.lineTo(cx + 4, cy + 4);
        ctx.moveTo(cx + 4, cy - 4); ctx.lineTo(cx - 4, cy + 4);
        ctx.stroke(); ctx.shadowBlur = 0;
      }
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <canvas
      ref={canvasRef}
      style={{ width: 52, height: 52, imageRendering: "crisp-edges", display: "block", flexShrink: 0 }}
    />
  );
}

// ── Mini provider icon dot ─────────────────────────────────────────────────────
function ProviderDot({ color, active }: { color: string; active: boolean }) {
  return (
    <span className="inline-block rounded-full flex-shrink-0"
      style={{
        width: 8, height: 8,
        background: active ? color : `${color}55`,
        boxShadow: active ? `0 0 8px ${color}` : "none",
        transition: "all 0.3s",
      }} />
  );
}

// ── Provider Card in panel ─────────────────────────────────────────────────────
function ProviderCard({
  prov, isActive, configuredKey, selectedModel,
  onActivate, onModelChange, onKeyChange,
}: {
  prov: ProviderDef;
  isActive: boolean;
  configuredKey: string;
  selectedModel: string;
  onActivate: (prov: ProviderDef, model: string) => void;
  onModelChange: (id: string, model: string) => void;
  onKeyChange: (id: string, key: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [keyInput, setKeyInput] = useState(configuredKey);
  const hasKey = prov.requiresKey ? configuredKey.length > 10 : true;

  return (
    <motion.div
      layout
      className="rounded-xl overflow-hidden"
      style={{
        background: isActive
          ? `linear-gradient(135deg, ${prov.color}18 0%, ${prov.color}08 100%)`
          : "rgba(255,255,255,0.02)",
        border: `1px solid ${isActive ? prov.color + "60" : "rgba(255,255,255,0.06)"}`,
        boxShadow: isActive ? `0 0 20px ${prov.color}18` : "none",
      }}
    >
      {/* Header row */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        <ProviderDot color={prov.color} active={hasKey} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-black" style={{ color: isActive ? prov.color : "#e2e8f0" }}>
              {prov.name}
            </span>
            {prov.badge && (
              <span className="text-[8px] font-bold px-1 py-px rounded"
                style={{ background: `${prov.color}22`, color: prov.color, border: `1px solid ${prov.color}44` }}>
                {prov.badge}
              </span>
            )}
            {isActive && (
              <span className="text-[8px] font-bold px-1 py-px rounded"
                style={{ background: "rgba(0,255,136,0.15)", color: "#00ff88", border: "1px solid rgba(0,255,136,0.35)" }}>
                ACTIVE
              </span>
            )}
          </div>
          <div className="text-[8px] font-mono" style={{ color: "rgba(255,255,255,0.3)" }}>
            {prov.category} · {prov.models.length} نموذج
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Quick activate */}
          <motion.button
            onClick={() => onActivate(prov, selectedModel || prov.models[0].id)}
            className="text-[8px] font-bold px-2 py-1 rounded-lg"
            style={{
              background: isActive ? `${prov.color}25` : "rgba(255,255,255,0.05)",
              border: `1px solid ${isActive ? prov.color + "50" : "rgba(255,255,255,0.1)"}`,
              color: isActive ? prov.color : "rgba(255,255,255,0.6)",
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {isActive ? "فعّال" : "تفعيل"}
          </motion.button>
          {/* Expand toggle */}
          <motion.button
            onClick={() => setExpanded(e => !e)}
            className="w-5 h-5 flex items-center justify-center rounded"
            style={{ color: "rgba(255,255,255,0.4)" }}
            animate={{ rotate: expanded ? 90 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
              <path d="M2 3l2 2 2-2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
          </motion.button>
        </div>
      </div>

      {/* Expanded section */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-2.5" style={{ borderTop: `1px solid ${prov.color}18` }}>
              {/* Model selector */}
              <div className="pt-2">
                <div className="text-[8px] font-bold tracking-widest mb-1.5" style={{ color: `${prov.color}90` }}>
                  النماذج المتاحة
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {prov.models.map(m => {
                    const isSelected = (selectedModel || prov.models[0].id) === m.id;
                    return (
                      <button
                        key={m.id}
                        onClick={() => onModelChange(prov.id, m.id)}
                        className="flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition-all"
                        style={{
                          background: isSelected ? `${prov.color}20` : "rgba(255,255,255,0.03)",
                          border: `1px solid ${isSelected ? prov.color + "50" : "rgba(255,255,255,0.06)"}`,
                        }}
                      >
                        <span className="text-[9px] font-semibold truncate"
                          style={{ color: isSelected ? prov.color : "rgba(255,255,255,0.65)" }}>
                          {m.label}
                        </span>
                        <span className="text-[7px] font-bold ml-1 flex-shrink-0"
                          style={{ color: isSelected ? prov.color : "rgba(255,255,255,0.3)" }}>
                          {m.tag}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* API Key input */}
              {prov.requiresKey && (
                <div>
                  <div className="text-[8px] font-bold tracking-widest mb-1" style={{ color: `${prov.color}90` }}>
                    مفتاح API
                  </div>
                  <div className="flex gap-1">
                    <input
                      type="password"
                      value={keyInput}
                      onChange={e => setKeyInput(e.target.value)}
                      placeholder={`${prov.id.toUpperCase()}-...`}
                      className="flex-1 rounded-lg px-2 py-1.5 text-[9px] font-mono outline-none"
                      style={{
                        background: "rgba(0,0,0,0.35)",
                        border: `1px solid ${keyInput.length > 10 ? prov.color + "50" : "rgba(255,255,255,0.08)"}`,
                        color: "rgba(255,255,255,0.8)",
                      }}
                    />
                    <motion.button
                      onClick={() => { onKeyChange(prov.id, keyInput); onActivate(prov, selectedModel || prov.models[0].id); }}
                      className="px-2 rounded-lg text-[8px] font-bold"
                      style={{ background: `${prov.color}20`, border: `1px solid ${prov.color}40`, color: prov.color }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      حفظ
                    </motion.button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Scan Progress Bar ──────────────────────────────────────────────────────────
function ScanBar({ progress, color }: { progress: number; color: string }) {
  return (
    <div className="relative h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
      <motion.div
        className="absolute inset-y-0 left-0 rounded-full"
        style={{ background: `linear-gradient(90deg, ${color}, ${color}88)` }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.3 }}
      />
      {/* Shimmer */}
      <motion.div
        className="absolute inset-y-0 w-8"
        style={{ background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)` }}
        animate={{ left: ["-10%", "110%"] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export function AIQuickSetupButton() {
  const { state, dispatch } = useStore();
  const { toast } = useToast();
  const [phase, setPhase]           = useState<Phase>("idle");
  const [open, setOpen]             = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanMsg, setScanMsg]       = useState("");
  const [selectedModels, setSelectedModels] = useState<Record<string, string>>({});
  const [keys, setKeys]             = useState<Record<string, string>>({});
  const panelRef = useRef<HTMLDivElement>(null);

  // Load saved keys
  useEffect(() => {
    const loaded: Record<string, string> = {};
    ALL_PROVIDERS.forEach(p => {
      const k = localStorage.getItem(KEY_PREFIX + p.id)?.trim() ?? "";
      if (k) loaded[p.id] = k;
    });
    setKeys(loaded);
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Keyboard shortcut
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "A") { e.preventDefault(); setOpen(o => !o); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  // Auto-init once
  useEffect(() => {
    if (!sessionStorage.getItem("mr7-autoinit")) {
      sessionStorage.setItem("mr7-autoinit", "1");
      setTimeout(autoScan, 1800);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const autoScan = useCallback(async () => {
    if (phase === "scanning") return;
    setPhase("scanning"); setScanProgress(0); setScanMsg("يتم مسح المفاتيح...");

    const total = ALL_PROVIDERS.length;
    for (let i = 0; i < total; i++) {
      const p = ALL_PROVIDERS[i];
      setScanProgress(Math.round((i / total) * 100));
      setScanMsg(`فحص ${p.name}...`);
      await new Promise(r => setTimeout(r, 80));

      if (p.requiresKey) {
        const key = localStorage.getItem(KEY_PREFIX + p.id)?.trim();
        if (key && key.length > 10) {
          const model = selectedModels[p.id] || p.models[0].id;
          applyProvider(p, model, key);
          setScanProgress(100);
          setScanMsg(`تم: ${p.name}`);
          setPhase("done");
          toast({ description: `AUTO — ${p.name} · ${p.models.find(m => m.id === model)?.label ?? model}` });
          setTimeout(() => setPhase("idle"), 3500);
          return;
        }
      } else {
        const model = selectedModels[p.id] || p.models[0].id;
        applyProvider(p, model, "");
        setScanProgress(100);
        setScanMsg(`محلي: ${p.name}`);
        setPhase("done");
        toast({ description: `AUTO — ${p.name} · ${p.models.find(m => m.id === model)?.label ?? model}` });
        setTimeout(() => setPhase("idle"), 3500);
        return;
      }
    }

    // Personal key fallback
    if ((state.settings.personalApiKey?.trim().length ?? 0) > 10) {
      dispatch({ type: "SET_SETTINGS", patch: { streaming: true, autoTitle: true } });
      setScanProgress(100); setScanMsg("المفتاح الشخصي");
      setPhase("done"); toast({ description: "AUTO — المفتاح الشخصي" });
      setTimeout(() => setPhase("idle"), 3500);
      return;
    }

    setPhase("fail"); setScanMsg("لم يُعثر على مزوّد");
    toast({ description: "لم يُعثر على مزوّد — أدخل مفتاح API", variant: "destructive" });
    setTimeout(() => setPhase("idle"), 2500);
  }, [phase, state.settings.personalApiKey, selectedModels, dispatch, toast]); // eslint-disable-line react-hooks/exhaustive-deps

  function applyProvider(p: ProviderDef, model: string, key: string) {
    const url = localStorage.getItem(URL_PREFIX + p.id)?.trim() || p.baseURL;
    if (key) {
      dispatch({ type: "SET_SETTINGS", patch: { personalApiKey: key, personalApiBaseURL: url, streaming: true, autoTitle: true } });
    }
    if (p.providerName !== "custom") {
      dispatch({ type: "SET_PROVIDER", provider: p.providerName, providerModel: model });
    } else {
      dispatch({ type: "SET_PROVIDER", provider: "custom", providerModel: model });
      dispatch({ type: "SET_SETTINGS", patch: { personalApiBaseURL: url } });
    }
  }

  function handleActivate(prov: ProviderDef, model: string) {
    const key = keys[prov.id] ?? localStorage.getItem(KEY_PREFIX + prov.id)?.trim() ?? "";
    applyProvider(prov, model, key);
    setPhase("done");
    toast({ description: `${prov.name} · ${prov.models.find(m => m.id === model)?.label ?? model}` });
    setTimeout(() => setPhase("idle"), 2500);
  }

  function handleKeyChange(id: string, key: string) {
    localStorage.setItem(KEY_PREFIX + id, key);
    setKeys(k => ({ ...k, [id]: key }));
  }

  function handleModelChange(id: string, model: string) {
    setSelectedModels(s => ({ ...s, [id]: model }));
  }

  const label = phase === "scanning" ? "SCAN" : phase === "done" ? "OK" : phase === "fail" ? "FAIL" : "AUTO";
  const configuredCount = ALL_PROVIDERS.filter(p =>
    p.requiresKey ? (keys[p.id]?.length ?? 0) > 10 : true
  ).length;

  return (
    <div className="relative flex-shrink-0" ref={panelRef}>
      {/* Main button */}
      <motion.button
        onClick={() => setOpen(o => !o)}
        disabled={phase === "scanning"}
        className="relative flex items-center gap-1 pl-0.5 pr-1.5 py-0.5 rounded-xl transition-all active:scale-95"
        style={{
          background: open
            ? "linear-gradient(135deg,rgba(0,255,136,0.14) 0%,rgba(0,229,255,0.08) 100%)"
            : "linear-gradient(135deg,rgba(0,255,136,0.07) 0%,rgba(0,229,255,0.03) 100%)",
          border: `1px solid rgba(0,255,136,${open ? 0.55 : 0.32})`,
          boxShadow: open
            ? "0 0 30px rgba(0,255,136,0.25), 0 0 10px rgba(0,229,255,0.12), inset 0 1px 0 rgba(0,255,136,0.15)"
            : "0 0 20px rgba(0,255,136,0.15), 0 0 7px rgba(0,229,255,0.08), inset 0 1px 0 rgba(0,255,136,0.08)",
          cursor: phase === "scanning" ? "wait" : "pointer",
        }}
        whileHover={{ scale: 1.03 }}
        aria-label="إعداد الذكاء الاصطناعي تلقائياً"
        title="AUTO SETUP · Ctrl+Shift+A"
      >
        {/* HUD corners */}
        <span className="absolute top-0.5 left-0.5 w-2 h-2 border-t border-l pointer-events-none"
          style={{ borderColor: "rgba(0,255,136,0.65)" }} />
        <span className="absolute bottom-0.5 right-0.5 w-2 h-2 border-b border-r pointer-events-none"
          style={{ borderColor: "rgba(0,255,136,0.65)" }} />
        {/* Scan line */}
        {phase === "scanning" && (
          <motion.span className="absolute inset-x-0 h-px pointer-events-none"
            style={{ background: "linear-gradient(90deg,transparent,rgba(0,229,255,0.9),transparent)", top: "50%" }}
            animate={{ top: ["15%", "85%", "15%"] }}
            transition={{ duration: 1.0, repeat: Infinity, ease: "linear" }} />
        )}
        <NexusAtom phase={phase} open={open} />
        <div className="hidden sm:flex flex-col items-start leading-none gap-0.5 pr-0.5">
          <span className="text-[7px] font-black tracking-widest uppercase"
            style={{ color: "rgba(0,255,136,0.5)" }}>
            {phase === "scanning" ? "SCAN" : "AUTO AI"}
          </span>
          <AnimatePresence mode="wait" initial={false}>
            <motion.span key={label}
              initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -3 }}
              transition={{ duration: 0.12 }}
              className="text-[11px] font-black"
              style={{ color: phase === "fail" ? "#ef4444" : phase === "done" ? "#22c55e" : "rgba(0,255,136,0.9)" }}>
              {label}
            </motion.span>
          </AnimatePresence>
        </div>
      </motion.button>

      {/* ── POPUP PANEL ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="absolute top-full mt-2.5 left-0 z-[9999]"
            style={{ width: 380 }}
          >
            <div className="rounded-2xl overflow-hidden"
              style={{
                background: "rgba(5,8,12,0.98)",
                border: "1px solid rgba(0,255,136,0.22)",
                boxShadow: "0 0 60px rgba(0,255,136,0.12), 0 20px 60px rgba(0,0,0,0.9), inset 0 1px 0 rgba(0,255,136,0.1)",
                backdropFilter: "blur(20px)",
              }}>
              {/* Top accent line */}
              <div className="h-px" style={{ background: "linear-gradient(90deg,transparent,rgba(0,255,136,0.8),rgba(0,229,255,0.5),transparent)" }} />

              {/* Header */}
              <div className="px-4 py-3 flex items-center justify-between"
                style={{ borderBottom: "1px solid rgba(0,255,136,0.08)" }}>
                <div>
                  <div className="text-[11px] font-black tracking-[0.22em] uppercase font-mono"
                    style={{ color: "rgba(0,255,136,0.9)" }}>
                    AI NEXUS SETUP
                  </div>
                  <div className="text-[9px] mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
                    {configuredCount} مزوّد مُهيَّأ من {ALL_PROVIDERS.length}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Config count bar */}
                  <div className="flex gap-0.5">
                    {ALL_PROVIDERS.slice(0, 8).map(p => (
                      <div key={p.id} className="w-1.5 h-3.5 rounded-sm"
                        style={{
                          background: (keys[p.id]?.length ?? 0) > 10 || !p.requiresKey
                            ? p.color : "rgba(255,255,255,0.08)",
                        }} />
                    ))}
                  </div>
                  <motion.button onClick={() => setOpen(false)}
                    className="w-6 h-6 rounded-lg flex items-center justify-center"
                    style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" }}
                    whileHover={{ background: "rgba(255,255,255,0.1)" }}>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </motion.button>
                </div>
              </div>

              {/* Scan progress */}
              {phase === "scanning" && (
                <div className="px-4 py-2.5" style={{ borderBottom: "1px solid rgba(0,255,136,0.06)" }}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[9px] font-mono" style={{ color: "rgba(0,229,255,0.8)" }}>{scanMsg}</span>
                    <span className="text-[9px] font-black font-mono" style={{ color: "rgba(0,255,136,0.9)" }}>{scanProgress}%</span>
                  </div>
                  <ScanBar progress={scanProgress} color="#00ff88" />
                </div>
              )}

              {/* Auto scan button */}
              <div className="px-4 pt-3 pb-2">
                <motion.button
                  onClick={autoScan}
                  disabled={phase === "scanning"}
                  className="w-full rounded-xl py-2.5 text-[10px] font-black tracking-widest uppercase flex items-center justify-center gap-2"
                  style={{
                    background: phase === "scanning"
                      ? "rgba(0,255,136,0.06)"
                      : "linear-gradient(135deg,rgba(0,255,136,0.18) 0%,rgba(0,229,255,0.1) 100%)",
                    border: `1px solid rgba(0,255,136,${phase === "scanning" ? 0.15 : 0.38})`,
                    color: phase === "scanning" ? "rgba(0,255,136,0.4)" : "rgba(0,255,136,0.9)",
                  }}
                  whileHover={phase !== "scanning" ? { scale: 1.01, boxShadow: "0 0 20px rgba(0,255,136,0.2)" } : {}}
                  whileTap={phase !== "scanning" ? { scale: 0.98 } : {}}
                >
                  {phase === "scanning" ? (
                    <>
                      <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                        ◌
                      </motion.span>
                      جارٍ المسح التلقائي...
                    </>
                  ) : (
                    <>
                      <span style={{ fontSize: 12 }}>⚡</span>
                      مسح تلقائي وتفعيل أفضل مزوّد
                    </>
                  )}
                </motion.button>
              </div>

              {/* Provider list */}
              <div className="px-4 pb-3 space-y-1.5 max-h-[380px] overflow-y-auto"
                style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(0,255,136,0.2) transparent" }}>
                <div className="text-[8px] font-bold tracking-[0.2em] uppercase mb-2 pt-1"
                  style={{ color: "rgba(0,255,136,0.4)" }}>
                  المزوّدون المتاحون
                </div>
                {ALL_PROVIDERS.map(p => (
                  <ProviderCard
                    key={p.id}
                    prov={p}
                    isActive={state.activeProvider === p.providerName && state.activeProviderModel === (selectedModels[p.id] || p.models[0].id)}
                    configuredKey={keys[p.id] ?? ""}
                    selectedModel={selectedModels[p.id] ?? p.models[0].id}
                    onActivate={handleActivate}
                    onModelChange={handleModelChange}
                    onKeyChange={handleKeyChange}
                  />
                ))}
              </div>

              {/* Footer */}
              <div className="px-4 py-2.5 flex items-center justify-between"
                style={{ borderTop: "1px solid rgba(0,255,136,0.07)" }}>
                <div className="text-[8px] font-mono" style={{ color: "rgba(255,255,255,0.25)" }}>
                  المزوّد النشط: <span style={{ color: "rgba(0,255,136,0.7)" }}>{state.activeProvider.toUpperCase()}</span>
                </div>
                <div className="flex items-center gap-1">
                  {["Ctrl", "Shift", "A"].map((k, i) => (
                    <span key={k} className="flex items-center gap-0.5">
                      {i > 0 && <span className="text-[7px]" style={{ color: "rgba(255,255,255,0.2)" }}>+</span>}
                      <kbd className="text-[7px] px-1.5 py-0.5 rounded font-mono"
                        style={{ background: "#0d1014", border: "1px solid rgba(0,255,136,0.2)", color: "rgba(0,255,136,0.65)" }}>
                        {k}
                      </kbd>
                    </span>
                  ))}
                </div>
              </div>

              <div className="h-px" style={{ background: "linear-gradient(90deg,transparent,rgba(0,229,255,0.3),transparent)" }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
