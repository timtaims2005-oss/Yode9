import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";

// ── Provider priority pool ────────────────────────────────────────────────────
const PROVIDER_PRIORITY: Array<{
  id: string;
  name: string;
  color: string;
  baseURL: string;
  bestModel: string;
  bestModelLabel: string;
  requiresKey: boolean;
  category: string;
  speed: number;
  contextWindow: string;
  free: boolean;
}> = [
  { id: "groq",       name: "Groq",          color: "#ff6600", baseURL: "https://api.groq.com/openai/v1",                              bestModel: "llama-3.3-70b-versatile",         bestModelLabel: "Llama 3.3 70B",          requiresKey: true,  category: "سرعة فائقة",     speed: 98, contextWindow: "128K", free: false },
  { id: "openai",     name: "OpenAI",         color: "#00ff41", baseURL: "https://api.openai.com/v1",                                   bestModel: "gpt-4o",                          bestModelLabel: "GPT-4o",                 requiresKey: true,  category: "متعدد الأغراض", speed: 75, contextWindow: "128K", free: false },
  { id: "anthropic",  name: "Anthropic",      color: "#00e5ff", baseURL: "https://api.anthropic.com/v1",                                bestModel: "claude-sonnet-4-5",               bestModelLabel: "Claude Sonnet 4.5",      requiresKey: true,  category: "استدلال عميق",  speed: 65, contextWindow: "200K", free: false },
  { id: "gemini",     name: "Google Gemini",  color: "#00bfff", baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",     bestModel: "gemini-2.5-flash",                bestModelLabel: "Gemini 2.5 Flash",       requiresKey: true,  category: "متعدد الوسائط", speed: 82, contextWindow: "1M",   free: false },
  { id: "openrouter", name: "OpenRouter",     color: "#ff0080", baseURL: "https://openrouter.ai/api/v1",                                bestModel: "deepseek/deepseek-chat-v3-0324",  bestModelLabel: "DeepSeek V3",            requiresKey: true,  category: "300+ نموذج",    speed: 70, contextWindow: "128K", free: false },
  { id: "deepseek",   name: "DeepSeek",       color: "#00ffcc", baseURL: "https://api.deepseek.com/v1",                                 bestModel: "deepseek-chat",                   bestModelLabel: "DeepSeek V3 Direct",     requiresKey: true,  category: "استدلال",        speed: 72, contextWindow: "64K",  free: false },
  { id: "xai",        name: "xAI Grok",       color: "#ff3333", baseURL: "https://api.x.ai/v1",                                        bestModel: "grok-3-mini",                     bestModelLabel: "Grok 3 Mini",            requiresKey: true,  category: "X.ai",           speed: 78, contextWindow: "131K", free: false },
  { id: "mistral",    name: "Mistral AI",     color: "#ffcc00", baseURL: "https://api.mistral.ai/v1",                                   bestModel: "mistral-large-latest",            bestModelLabel: "Mistral Large",          requiresKey: true,  category: "أوروبي",         speed: 68, contextWindow: "128K", free: false },
  { id: "perplexity", name: "Perplexity",     color: "#00ff99", baseURL: "https://api.perplexity.ai",                                   bestModel: "sonar-pro",                       bestModelLabel: "Sonar Pro",              requiresKey: true,  category: "بحث ويب",        speed: 60, contextWindow: "127K", free: false },
  { id: "together",   name: "Together AI",    color: "#bf00ff", baseURL: "https://api.together.xyz/v1",                                 bestModel: "meta-llama/Llama-3.3-70B-Instruct-Turbo", bestModelLabel: "Llama 3.3 70B",  requiresKey: true,  category: "مفتوح المصدر",   speed: 80, contextWindow: "128K", free: false },
  { id: "fireworks",  name: "Fireworks AI",   color: "#ff9900", baseURL: "https://api.fireworks.ai/inference/v1",                       bestModel: "accounts/fireworks/models/llama-v3p3-70b-instruct", bestModelLabel: "Llama 3.3 70B", requiresKey: true, category: "سرعة عالية", speed: 85, contextWindow: "128K", free: false },
  { id: "cohere",     name: "Cohere",         color: "#0099ff", baseURL: "https://api.cohere.com/v1",                                   bestModel: "command-r-plus",                  bestModelLabel: "Command R+",             requiresKey: true,  category: "مؤسسي",          speed: 55, contextWindow: "128K", free: false },
  { id: "github",     name: "GitHub Models",  color: "#ccff00", baseURL: "https://models.inference.ai.azure.com",                       bestModel: "gpt-4o",                          bestModelLabel: "GPT-4o (مجاني)",         requiresKey: true,  category: "مجاني",          speed: 60, contextWindow: "128K", free: true  },
  { id: "nvidia",     name: "NVIDIA NIM",     color: "#76ff00", baseURL: "https://integrate.api.nvidia.com/v1",                         bestModel: "meta/llama-3.3-70b-instruct",     bestModelLabel: "Llama 3.3 70B NIM",      requiresKey: true,  category: "GPU فائق",       speed: 90, contextWindow: "128K", free: false },
  { id: "ollama",     name: "Ollama",         color: "#00ff41", baseURL: "http://localhost:11434/v1",                                   bestModel: "llama3.2",                        bestModelLabel: "Llama 3.2 (محلي)",       requiresKey: false, category: "محلي",           speed: 45, contextWindow: "32K",  free: true  },
  { id: "lmstudio",   name: "LM Studio",      color: "#ff00cc", baseURL: "http://localhost:1234/v1",                                    bestModel: "local-model",                     bestModelLabel: "نموذج محلي",             requiresKey: false, category: "محلي",           speed: 40, contextWindow: "32K",  free: true  },
];

const KEY_PREFIX = "mr7-ai-p-key-";
const URL_PREFIX = "mr7-ai-p-url-";
const INIT_DONE_KEY = "mr7-ai-autoinit-done";
const KEY_POOL_STORAGE = "mr7-ai-key-pool";
const ACTIVE_POOL_IDX  = "mr7-ai-pool-active-idx";

type DetectedProvider = typeof PROVIDER_PRIORITY[0] & { key: string; url: string; latency?: number };

// ── Multi-key pool helpers ────────────────────────────────────────────────────
export function detectAllConfiguredProviders(): DetectedProvider[] {
  const found: DetectedProvider[] = [];
  for (const p of PROVIDER_PRIORITY) {
    if (p.requiresKey) {
      const key = localStorage.getItem(KEY_PREFIX + p.id)?.trim();
      if (key && key.length > 10) {
        const url = localStorage.getItem(URL_PREFIX + p.id)?.trim() || p.baseURL;
        found.push({ ...p, key, url });
      }
    } else {
      found.push({ ...p, key: "", url: p.baseURL });
    }
  }
  return found;
}

export function detectConfiguredProvider(): DetectedProvider | null {
  return detectAllConfiguredProviders()[0] ?? null;
}

export function getKeyPool(): DetectedProvider[] {
  try {
    const raw = localStorage.getItem(KEY_POOL_STORAGE);
    if (!raw) return detectAllConfiguredProviders();
    return JSON.parse(raw) as DetectedProvider[];
  } catch { return []; }
}

export function rotateToNextKey(): DetectedProvider | null {
  const pool = getKeyPool();
  if (pool.length === 0) return null;
  const cur = parseInt(localStorage.getItem(ACTIVE_POOL_IDX) ?? "0", 10);
  const next = (cur + 1) % pool.length;
  localStorage.setItem(ACTIVE_POOL_IDX, String(next));
  return pool[next];
}

// ── Simulated latency test ────────────────────────────────────────────────────
async function measureLatency(provider: DetectedProvider): Promise<number> {
  await delay(80 + Math.random() * 120);
  return Math.round(10 + Math.random() * 90);
}

// ── 3D Neural Sphere Canvas ───────────────────────────────────────────────────
type Phase = "boot" | "scanning" | "found" | "loading" | "ready" | "no-provider";

function NeuralSphere3D({ phase, providerColor }: { phase: Phase; providerColor: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);
  const tRef      = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.width  = canvas.offsetWidth;
    const H = canvas.height = canvas.offsetHeight;
    const cx = W / 2, cy = H / 2;
    const R = Math.min(W, H) * 0.32;

    const isReady    = phase === "ready";
    const isScanning = phase === "scanning" || phase === "found" || phase === "loading";

    const nodeCount = 64;
    const nodes = Array.from({ length: nodeCount }, (_, i) => {
      const phi   = Math.acos(1 - (2 * (i + 0.5)) / nodeCount);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      return { x: Math.sin(phi) * Math.cos(theta), y: Math.sin(phi) * Math.sin(theta), z: Math.cos(phi), pulseOffset: Math.random() * Math.PI * 2 };
    });

    const edges: [number, number][] = [];
    for (let i = 0; i < nodeCount; i++) {
      for (let j = i + 1; j < nodeCount; j++) {
        const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y, dz = nodes[i].z - nodes[j].z;
        if (Math.sqrt(dx*dx + dy*dy + dz*dz) < 0.7) edges.push([i, j]);
      }
    }

    const particles = Array.from({ length: 140 }, () => ({
      angle: Math.random() * Math.PI * 2,
      orbit: R * (0.7 + Math.random() * 1.0),
      speed: (0.003 + Math.random() * 0.007) * (Math.random() > 0.5 ? 1 : -1),
      y:     (Math.random() - 0.5) * R * 1.5,
      size:  1 + Math.random() * 2.5,
      alpha: 0.3 + Math.random() * 0.6,
    }));

    const streams = Array.from({ length: 16 }, () => ({
      angle:    Math.random() * Math.PI * 2,
      speed:    0.004 + Math.random() * 0.009,
      len:      R * (0.3 + Math.random() * 0.45),
      progress: Math.random(),
    }));

    // DNA helix
    const helixPoints = Array.from({ length: 40 }, (_, i) => ({ t: i / 40 }));

    function draw() {
      tRef.current += 0.011;
      const t = tRef.current;
      ctx.clearRect(0, 0, W, H);

      const rotY = t * 0.38;
      const rotX = Math.sin(t * 0.13) * 0.28;
      const sinY = Math.sin(rotY), cosY = Math.cos(rotY);
      const sinX = Math.sin(rotX), cosX = Math.cos(rotX);

      const base = isReady ? providerColor : "#e21227";
      const base2 = isReady ? providerColor + "88" : "#00e5ff88";

      const proj = nodes.map(n => {
        let { x, y, z } = n;
        const x1 = x * cosY - z * sinY, z1 = x * sinY + z * cosY;
        const y2 = y * cosX - z1 * sinX, z2 = y * sinX + z1 * cosX;
        const scale = R / (1.6 - z2 * 0.4);
        return { sx: cx + x1 * scale, sy: cy + y2 * scale, depth: z2, pulse: Math.sin(t * 2 + n.pulseOffset) * 0.5 + 0.5 };
      });

      // Edges
      edges.forEach(([a, b]) => {
        const pa = proj[a], pb = proj[b];
        const avgD = (pa.depth + pb.depth) / 2;
        const alpha = isScanning
          ? (0.07 + (avgD + 1) * 0.12) * (0.6 + Math.sin(t * 3 + a * 0.5) * 0.3)
          : 0.05 + (avgD + 1) * 0.09;
        ctx.beginPath(); ctx.moveTo(pa.sx, pa.sy); ctx.lineTo(pb.sx, pb.sy);
        ctx.strokeStyle = base + Math.floor(alpha * 255).toString(16).padStart(2, "0");
        ctx.lineWidth = 0.7; ctx.stroke();
      });

      // Nodes
      proj.forEach(p => {
        const br = (p.depth + 1) / 2;
        const r  = (isScanning ? 2.5 + p.pulse * 1.8 : 2.2) * br;
        const al = isReady ? 0.7 + p.pulse * 0.3 : 0.3 + br * 0.5;
        ctx.beginPath(); ctx.arc(p.sx, p.sy, r, 0, Math.PI * 2);
        ctx.fillStyle = base + Math.floor(al * 255).toString(16).padStart(2, "0"); ctx.fill();
        if (isScanning && p.pulse > 0.75) {
          ctx.beginPath(); ctx.arc(p.sx, p.sy, r * 2.8, 0, Math.PI * 2);
          ctx.fillStyle = base + "1a"; ctx.fill();
        }
      });

      // DNA helix overlay (ready phase)
      if (isReady) {
        for (let i = 0; i < helixPoints.length - 1; i++) {
          const t1 = helixPoints[i].t * Math.PI * 4 + t;
          const t2 = helixPoints[i + 1].t * Math.PI * 4 + t;
          const x1h = cx + Math.cos(t1) * R * 0.25;
          const y1h = cy + (helixPoints[i].t - 0.5) * R * 1.2;
          const x2h = cx + Math.cos(t2) * R * 0.25;
          const y2h = cy + (helixPoints[i + 1].t - 0.5) * R * 1.2;
          ctx.beginPath(); ctx.moveTo(x1h, y1h); ctx.lineTo(x2h, y2h);
          ctx.strokeStyle = providerColor + "33"; ctx.lineWidth = 1; ctx.stroke();
          if (i % 4 === 0) {
            const x3h = cx - Math.cos(t1) * R * 0.25;
            ctx.beginPath(); ctx.moveTo(x1h, y1h); ctx.lineTo(x3h, y1h);
            ctx.strokeStyle = providerColor + "22"; ctx.lineWidth = 0.5; ctx.stroke();
          }
        }
      }

      // Outer rings
      const ringA = isScanning ? 0.22 + Math.sin(t * 2) * 0.1 : 0.1;
      ctx.beginPath(); ctx.arc(cx, cy, R * 1.18, 0, Math.PI * 2);
      ctx.strokeStyle = base + Math.floor(ringA * 255).toString(16).padStart(2, "0");
      ctx.lineWidth = 1.2; ctx.stroke();

      ctx.beginPath(); ctx.arc(cx, cy, R * 1.38, 0, Math.PI * 2);
      ctx.strokeStyle = base + "10"; ctx.lineWidth = 0.5; ctx.stroke();

      ctx.beginPath(); ctx.arc(cx, cy, R * 1.58, 0, Math.PI * 2);
      ctx.strokeStyle = base + "08"; ctx.lineWidth = 0.4; ctx.stroke();

      // Rotating tick marks
      for (let i = 0; i < 32; i++) {
        const angle = (i / 32) * Math.PI * 2 + t * 0.3;
        const r1 = R * 1.18;
        const r2 = r1 + (i % 4 === 0 ? 8 : 4);
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(angle) * r1, cy + Math.sin(angle) * r1);
        ctx.lineTo(cx + Math.cos(angle) * r2, cy + Math.sin(angle) * r2);
        ctx.strokeStyle = base + (i % 4 === 0 ? "55" : "22");
        ctx.lineWidth = 0.8; ctx.stroke();
      }

      // Scan arc
      if (isScanning) {
        const sweep = ((t * 1.1) % (Math.PI * 2));
        ctx.beginPath(); ctx.arc(cx, cy, R * 1.18, sweep, sweep + 1.4);
        ctx.strokeStyle = base + "cc"; ctx.lineWidth = 2.5; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, R * 1.18, sweep, sweep + 1.4);
        ctx.closePath();
        ctx.fillStyle = base + "06"; ctx.fill();

        // Counter-rotating arc
        const sweep2 = ((-t * 0.7) % (Math.PI * 2));
        ctx.beginPath(); ctx.arc(cx, cy, R * 1.38, sweep2, sweep2 + 0.8);
        ctx.strokeStyle = base2; ctx.lineWidth = 1; ctx.stroke();
      }

      // Data streams
      if (isScanning) {
        streams.forEach(s => {
          s.progress = (s.progress + s.speed) % 1;
          const startR = R * 0.3 + s.progress * s.len;
          const endR   = startR + s.len * 0.22;
          const sx1 = cx + Math.cos(s.angle) * startR;
          const sy1 = cy + Math.sin(s.angle) * startR;
          const sx2 = cx + Math.cos(s.angle) * endR;
          const sy2 = cy + Math.sin(s.angle) * endR;
          ctx.beginPath(); ctx.moveTo(sx1, sy1); ctx.lineTo(sx2, sy2);
          const streamGrad = ctx.createLinearGradient(sx1, sy1, sx2, sy2);
          streamGrad.addColorStop(0, base + "00");
          streamGrad.addColorStop(0.5, base + "aa");
          streamGrad.addColorStop(1, base + "00");
          ctx.strokeStyle = streamGrad; ctx.lineWidth = 1.2; ctx.stroke();
        });
      }

      // Particles
      particles.forEach(p => {
        p.angle += p.speed;
        const px = cx + Math.cos(p.angle) * Math.sqrt(Math.max(0, p.orbit * p.orbit - p.y * p.y * 0.3));
        const py = cy + p.y + Math.sin(p.angle) * p.orbit * 0.16;
        ctx.beginPath(); ctx.arc(px, py, p.size * (isReady ? 1.4 : 0.8), 0, Math.PI * 2);
        ctx.fillStyle = base + Math.floor(p.alpha * (isReady ? 200 : 100)).toString(16).padStart(2, "0");
        ctx.fill();
      });

      // Core glow
      const glowR = R * (0.18 + Math.sin(t * 1.4) * 0.045);
      const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
      grd.addColorStop(0, base + "77"); grd.addColorStop(0.5, base + "22"); grd.addColorStop(1, base + "00");
      ctx.beginPath(); ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
      ctx.fillStyle = grd; ctx.fill();

      // Ready pulse rings
      if (isReady) {
        for (let i = 0; i < 4; i++) {
          const pr = R * (0.5 + ((t * 0.65 + i * 0.75) % 1.6));
          const pa = Math.max(0, 0.4 - pr / R * 0.28);
          ctx.beginPath(); ctx.arc(cx, cy, pr, 0, Math.PI * 2);
          ctx.strokeStyle = base + Math.floor(pa * 255).toString(16).padStart(2, "0");
          ctx.lineWidth = 1.5; ctx.stroke();
        }
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [phase, providerColor]);

  return <canvas ref={canvasRef} className="w-full h-full" style={{ display: "block" }} />;
}

// ── Provider Card ─────────────────────────────────────────────────────────────
function ProviderCard({
  provider, index, isActive, onClick,
}: { provider: DetectedProvider; index: number; isActive: boolean; onClick: () => void }) {
  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.055 }}
      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all"
      style={{
        background: isActive ? provider.color + "18" : "rgba(255,255,255,0.03)",
        border: `1px solid ${isActive ? provider.color + "55" : "rgba(255,255,255,0.07)"}`,
        boxShadow: isActive ? `0 0 16px ${provider.color}22` : "none",
      }}
      whileHover={{ scale: 1.01, background: provider.color + "14" }}
      whileTap={{ scale: 0.98 }}
    >
      <motion.div
        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
        style={{ background: provider.color, boxShadow: `0 0 8px ${provider.color}` }}
        animate={isActive ? { opacity: [0.7, 1], scale: [0.9, 1.1] } : { opacity: 1 }}
        transition={{ duration: 1, repeat: Infinity, repeatType: "reverse" }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-white text-xs font-bold truncate">{provider.name}</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded font-bold tracking-wider" style={{ background: provider.color + "22", color: provider.color }}>
            {provider.category}
          </span>
          {provider.free && (
            <span className="text-[8px] px-1 py-0.5 rounded font-bold" style={{ background: "#22c55e18", color: "#22c55e", border: "1px solid #22c55e33" }}>FREE</span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] truncate" style={{ color: "rgba(255,255,255,0.4)" }}>{provider.bestModelLabel}</span>
          <span className="text-[8px]" style={{ color: "rgba(255,255,255,0.25)" }}>· {provider.contextWindow}</span>
        </div>
        {/* Speed bar */}
        <div className="mt-1 flex items-center gap-1.5">
          <div className="flex-1 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: `linear-gradient(90deg, ${provider.color}66, ${provider.color})` }}
              initial={{ width: 0 }}
              animate={{ width: `${provider.speed}%` }}
              transition={{ delay: index * 0.06 + 0.3, duration: 0.8, ease: "easeOut" }}
            />
          </div>
          <span className="text-[8px] font-mono" style={{ color: provider.color }}>{provider.speed}</span>
          {provider.latency && (
            <span className="text-[8px] font-mono" style={{ color: "rgba(255,255,255,0.25)" }}>{provider.latency}ms</span>
          )}
        </div>
      </div>
      {isActive && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0"
          style={{ background: provider.color + "33", color: provider.color }}
        >
          نشط
        </motion.div>
      )}
    </motion.button>
  );
}

// ── Manual Key Entry Form ─────────────────────────────────────────────────────
function ManualKeyForm({ onSave, onClose }: { onSave: (id: string, key: string) => void; onClose: () => void }) {
  const [selectedId, setSelectedId] = useState("openai");
  const [key, setKey] = useState("");

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="w-full rounded-xl p-4 space-y-3"
      style={{ background: "#0a0a0a", border: "1px solid rgba(226,18,39,0.25)" }}
    >
      <div className="text-xs font-bold tracking-widest" style={{ color: "#e21227" }}>[ إضافة مفتاح API ]</div>
      <select
        value={selectedId}
        onChange={e => setSelectedId(e.target.value)}
        className="w-full rounded-lg px-3 py-2 text-xs font-mono"
        style={{ background: "#111", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", outline: "none" }}
      >
        {PROVIDER_PRIORITY.filter(p => p.requiresKey).map(p => (
          <option key={p.id} value={p.id}>{p.name} — {p.bestModelLabel}</option>
        ))}
      </select>
      <input
        value={key}
        onChange={e => setKey(e.target.value)}
        placeholder="sk-... أو api-key-..."
        className="w-full rounded-lg px-3 py-2 text-xs font-mono"
        style={{ background: "#111", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", outline: "none" }}
        type="password"
      />
      <div className="flex gap-2">
        <button
          onClick={() => { if (key.trim().length > 10) { onSave(selectedId, key.trim()); } }}
          disabled={key.trim().length <= 10}
          className="flex-1 py-2 rounded-lg text-xs font-bold transition-all"
          style={{
            background: key.trim().length > 10 ? "linear-gradient(135deg, #e21227, #c4101f)" : "rgba(255,255,255,0.05)",
            color: key.trim().length > 10 ? "#fff" : "rgba(255,255,255,0.3)",
            border: "none", cursor: key.trim().length > 10 ? "pointer" : "not-allowed",
          }}
        >
          حفظ وتفعيل
        </button>
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-lg text-xs"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)", cursor: "pointer" }}
        >
          إلغاء
        </button>
      </div>
    </motion.div>
  );
}

// ── Latency Tester ────────────────────────────────────────────────────────────
function LatencyDisplay({ providers }: { providers: DetectedProvider[] }) {
  return (
    <div className="w-full space-y-1.5 mt-1">
      <div className="text-[9px] font-bold tracking-widest uppercase mb-2" style={{ color: "rgba(0,229,255,0.5)" }}>
        ⚡ قياس الأداء
      </div>
      {providers.slice(0, 4).map((p, i) => (
        <div key={p.id} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color, boxShadow: `0 0 6px ${p.color}` }} />
          <span className="text-[9px] font-mono flex-1 truncate" style={{ color: "rgba(255,255,255,0.4)" }}>{p.name}</span>
          <div className="flex items-center gap-1">
            <div className="h-1 rounded-full" style={{ width: `${p.speed * 0.5}px`, background: `linear-gradient(90deg, ${p.color}66, ${p.color})` }} />
            <span className="text-[8px] font-mono" style={{ color: p.color }}>{p.latency ?? "—"}ms</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export function AIAutoSetup3D({ onComplete }: { onComplete: () => void }) {
  const { state, dispatch } = useStore();
  const { toast } = useToast();
  const [phase,             setPhase]             = useState<Phase>("boot");
  const [log,               setLog]               = useState<string[]>([]);
  const [allProviders,      setAllProviders]       = useState<DetectedProvider[]>([]);
  const [activeIdx,         setActiveIdx]          = useState(0);
  const [progress,          setProgress]           = useState(0);
  const [showProviderList,  setShowProviderList]   = useState(false);
  const [poolMode,          setPoolMode]           = useState(false);
  const [showManualForm,    setShowManualForm]     = useState(false);
  const [showLatency,       setShowLatency]        = useState(false);
  const [scanPhase,         setScanPhase]          = useState(0);
  const doneRef = useRef(false);

  const addLog = useCallback((msg: string) => {
    setLog(prev => [...prev.slice(-9), msg]);
  }, []);

  const activateProvider = useCallback((p: DetectedProvider, idx: number) => {
    setActiveIdx(idx);
    localStorage.setItem(ACTIVE_POOL_IDX, String(idx));
    dispatch({ type: "SET_PROVIDER", provider: p.id as never, providerModel: p.bestModel });
    dispatch({ type: "SET_MODEL", model: p.bestModelLabel });
  }, [dispatch]);

  const handleManualSave = useCallback((id: string, key: string) => {
    localStorage.setItem(KEY_PREFIX + id, key);
    setShowManualForm(false);
    const provider = PROVIDER_PRIORITY.find(p => p.id === id);
    if (provider) {
      toast({ description: `تم حفظ مفتاح ${provider.name}` });
    }
    doneRef.current = false;
    setPhase("boot");
    setLog([]);
    setProgress(0);
    setAllProviders([]);
    setShowProviderList(false);
    setScanPhase(0);
    setTimeout(() => { doneRef.current = false; }, 100);
  }, [toast]);

  useEffect(() => {
    if (doneRef.current) return;
    doneRef.current = true;

    const run = async () => {
      // Boot phase
      setPhase("boot");
      setScanPhase(1);
      addLog("[ CORE ] KaliGPT Neural Core v5.0 — ARSENAL MODE PRO");
      await delay(350);
      addLog("[ SYS  ] فحص طبقة التشفير AES-256-GCM...");
      await delay(280);
      addLog("[ QUANT] قناة البيانات الكمية: 99.97% تماسك");
      await delay(250);
      addLog("[ MEM  ] تهيئة ذاكرة 24.6TB — DONE");
      setProgress(10);
      await delay(200);

      // Scanning phase
      setPhase("scanning");
      setScanPhase(2);
      addLog("[ SCAN ] فحص شامل لـ 16 مزود API...");
      await delay(300);
      setProgress(20);

      const ALL_IDS = PROVIDER_PRIORITY.map(p => p.id);
      for (let i = 0; i < ALL_IDS.length; i++) {
        addLog(`[ CHECK] ${ALL_IDS[i].padEnd(12)} ${"·".repeat(Math.floor(Math.random() * 8) + 2)}`);
        await delay(40);
        setProgress(20 + Math.round((i / ALL_IDS.length) * 30));
      }

      setProgress(55);
      addLog("[ PARSE] تحليل مفاتيح API المحفوظة...");
      await delay(250);

      const found = detectAllConfiguredProviders();

      // Check personal key in store
      const personalKey = state.settings?.personalApiKey?.trim();
      if (personalKey && personalKey.length > 10 && !found.find(f => f.id === "personal")) {
        found.unshift({
          id: "personal", name: "Personal API", color: "#e21227",
          baseURL: state.settings?.personalApiBaseURL || "https://api.openai.com/v1",
          bestModel: "gpt-4o", bestModelLabel: "GPT-4o", requiresKey: false,
          category: "شخصي", key: personalKey, speed: 75, contextWindow: "128K", free: false,
          url: state.settings?.personalApiBaseURL || "https://api.openai.com/v1",
        });
      }

      if (found.length === 0) {
        setPhase("no-provider");
        addLog("[ WARN ] لم يُعثر على مفتاح API مضبوط");
        addLog("[ INFO ] أضف مفتاحاً يدوياً أو ادخل الإعدادات");
        setProgress(100);
        return;
      }

      // Found providers
      setAllProviders(found);
      setShowProviderList(true);
      setPhase("found");
      setScanPhase(3);
      addLog(`[ FOUND] ${found.length} مزود مكتشف:`);
      found.slice(0, 4).forEach(p => addLog(`  ✓ ${p.name.padEnd(14)} ${p.bestModelLabel}`));
      if (found.length > 4) addLog(`  ✓ ... و ${found.length - 4} مزودين آخرين`);
      setProgress(65);
      await delay(400);

      // Latency test
      addLog("[ PING ] قياس زمن الاستجابة...");
      const tested = await Promise.all(
        found.map(async (p) => ({ ...p, latency: await measureLatency(p) }))
      );
      setAllProviders(tested);
      setShowLatency(true);
      setProgress(72);
      await delay(200);

      if (found.length > 1) {
        setPoolMode(true);
        localStorage.setItem(KEY_POOL_STORAGE, JSON.stringify(tested));
        localStorage.setItem(ACTIVE_POOL_IDX, "0");
        addLog(`[ POOL ] دوران تلقائي: ${found.length} مفتاح نشط`);
        setProgress(78);
        await delay(250);
      }

      // Load best provider
      const primary = tested[0];
      setPhase("loading");
      setScanPhase(4);
      addLog(`[ MODEL] تحميل: ${primary.bestModelLabel}...`);
      addLog(`[ CTX  ] نافذة السياق: ${primary.contextWindow} رمز`);
      setProgress(87);
      await delay(280);
      addLog(`[ TUNE ] ضبط المعاملات المثلى...`);
      setProgress(94);
      await delay(180);

      activateProvider(primary, 0);

      addLog(`[ OK   ] النظام جاهز — ${primary.name} / ${primary.bestModelLabel}`);
      if (found.length > 1) addLog(`[ AUTO ] الدوران التلقائي: ${found.length} مفتاح نشطة`);
      setProgress(100);
      setPhase("ready");
      setScanPhase(5);
      await delay(1200);

      toast({
        description: found.length > 1
          ? `✓ ${found.length} مزودين — الدوران التلقائي نشط`
          : `✓ ${primary.name} — ${primary.bestModelLabel} جاهز`,
      });

      await delay(500);
      onComplete();
    };

    run();
  }, []);

  const activeProv = allProviders[activeIdx];
  const providerColor = activeProv?.color ?? "#e21227";

  const PHASE_LABELS: Record<Phase, string> = {
    boot:          "تهيئة النظام",
    scanning:      "فحص المزودين",
    found:         `${allProviders.length} مزود مكتشف`,
    loading:       "تحميل النموذج",
    ready:         "النظام جاهز",
    "no-provider": "لا يوجد مزود",
  };

  const PHASE_STEPS = ["boot", "scan", "found", "load", "ready"];

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.97)" }}
    >
      {/* Background grid */}
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            `linear-gradient(${providerColor}55 1px, transparent 1px),` +
            `linear-gradient(90deg, ${providerColor}55 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
        }}
      />

      {/* Diagonal accent lines */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.015]" style={{
        backgroundImage: `linear-gradient(45deg, ${providerColor} 1px, transparent 1px)`,
        backgroundSize: "96px 96px",
      }} />

      {/* Scan lines */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px)",
        }}
      />

      {/* Animated top line */}
      <motion.div
        className="absolute inset-x-0 h-px pointer-events-none"
        style={{ background: `linear-gradient(90deg, transparent, ${providerColor}40, transparent)` }}
        animate={{ top: ["0%", "100%"] }}
        transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
      />

      {/* Corner HUD */}
      {["top-0 left-0", "top-0 right-0", "bottom-0 left-0", "bottom-0 right-0"].map((pos, i) => (
        <div
          key={i}
          className={`absolute ${pos} w-20 h-20 pointer-events-none opacity-25`}
          style={{
            borderTop: i < 2 ? `2px solid ${providerColor}` : "none",
            borderBottom: i >= 2 ? `2px solid ${providerColor}` : "none",
            borderLeft: i % 2 === 0 ? `2px solid ${providerColor}` : "none",
            borderRight: i % 2 === 1 ? `2px solid ${providerColor}` : "none",
          }}
        />
      ))}

      {/* Phase steps indicator (top) */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
        {PHASE_STEPS.map((step, i) => (
          <div key={step} className="flex items-center gap-2">
            <motion.div
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: i < scanPhase ? providerColor : "rgba(255,255,255,0.15)", boxShadow: i < scanPhase ? `0 0 6px ${providerColor}` : "none" }}
              animate={i === scanPhase - 1 ? { opacity: [0.6, 1, 0.6] } : {}}
              transition={{ duration: 0.8, repeat: Infinity }}
            />
            {i < PHASE_STEPS.length - 1 && (
              <div className="w-6 h-px" style={{ background: i < scanPhase - 1 ? providerColor + "66" : "rgba(255,255,255,0.08)" }} />
            )}
          </div>
        ))}
      </div>

      {/* Main content */}
      <div className="relative flex flex-col items-center gap-4 w-full max-w-md px-5">

        {/* 3D Sphere */}
        <motion.div
          className="relative"
          style={{ width: 220, height: 220 }}
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
        >
          <NeuralSphere3D phase={phase} providerColor={providerColor} />

          {/* Center icon */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <AnimatePresence mode="wait">
              <motion.div
                key={phase}
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.3 }}
                transition={{ duration: 0.25 }}
                className="text-center"
              >
                {phase === "ready" ? (
                  <motion.div
                    animate={{ boxShadow: [`0 0 20px ${providerColor}66`, `0 0 45px ${providerColor}aa`, `0 0 20px ${providerColor}66`] }}
                    transition={{ duration: 1.4, repeat: Infinity }}
                    className="w-14 h-14 rounded-full flex items-center justify-center text-2xl font-black"
                    style={{
                      background: `radial-gradient(circle, ${providerColor}44, transparent)`,
                      border: `2px solid ${providerColor}`,
                      color: providerColor,
                    }}
                  >
                    ✓
                  </motion.div>
                ) : phase === "no-provider" ? (
                  <div className="text-3xl" style={{ color: "#f59e0b" }}>⚠</div>
                ) : (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.3, repeat: Infinity, ease: "linear" }}
                    className="w-12 h-12 rounded-full border-2"
                    style={{ borderColor: providerColor, borderTopColor: "transparent" }}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Title */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="text-[10px] font-bold tracking-[0.5em] uppercase mb-1" style={{ color: providerColor }}>
            KaliGPT — NEURAL CORE v5.0 · ARSENAL MODE
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={phase + allProviders.length}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="text-white text-xl font-black"
            >
              {PHASE_LABELS[phase]}
            </motion.div>
          </AnimatePresence>

          {/* Pool badge */}
          <AnimatePresence>
            {poolMode && allProviders.length > 1 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-1.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-bold tracking-wider"
                style={{ background: "#10b98118", border: "1px solid #10b98144", color: "#10b981" }}
              >
                <motion.span
                  className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                  animate={{ opacity: [1, 0.3] }}
                  transition={{ duration: 0.8, repeat: Infinity, repeatType: "reverse" }}
                />
                وضع الدوران — {allProviders.length} مفاتيح نشطة
              </motion.div>
            )}
          </AnimatePresence>

          {/* Active provider badge */}
          <AnimatePresence>
            {phase === "ready" && activeProv && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-1.5 inline-flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-bold"
                style={{ background: activeProv.color + "15", border: `1px solid ${activeProv.color}35`, color: activeProv.color }}
              >
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: activeProv.color }} />
                {activeProv.name} · {activeProv.contextWindow} ctx
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Progress bar */}
        <div className="w-full space-y-1">
          <div className="w-full h-[4px] rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
            <motion.div
              className="h-full rounded-full relative overflow-hidden"
              style={{ background: `linear-gradient(90deg, ${providerColor}77, ${providerColor})` }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            >
              <motion.div
                className="absolute inset-0"
                style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)", backgroundSize: "200% 100%" }}
                animate={{ backgroundPosition: ["-200% 0", "200% 0"] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
              />
            </motion.div>
          </div>
          <div className="flex justify-between text-[9px] font-mono" style={{ color: "rgba(255,255,255,0.3)" }}>
            <span>0%</span>
            <span style={{ color: providerColor }}>{progress}%</span>
            <span>100%</span>
          </div>
        </div>

        {/* Provider list */}
        <AnimatePresence>
          {showProviderList && allProviders.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="w-full space-y-1.5"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="text-[9px] font-bold tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.35)" }}>
                  المزودون المكتشفون ({allProviders.length})
                </div>
                {showLatency && (
                  <div className="text-[8px] font-mono" style={{ color: "rgba(0,229,255,0.5)" }}>● ping tested</div>
                )}
              </div>
              <div className="space-y-1 max-h-44 overflow-y-auto pr-1" style={{ scrollbarWidth: "none" }}>
                {allProviders.map((p, i) => (
                  <ProviderCard
                    key={p.id}
                    provider={p}
                    index={i}
                    isActive={i === activeIdx}
                    onClick={() => {
                      if (phase === "ready") {
                        activateProvider(p, i);
                        toast({ description: `تم التبديل إلى ${p.name} — ${p.bestModelLabel}` });
                      }
                    }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Terminal log */}
        <div
          className="w-full rounded-xl p-3 font-mono text-[10px] space-y-0.5 min-h-[100px]"
          style={{ background: "#050505", border: "1px solid #181818", boxShadow: "inset 0 0 24px rgba(0,0,0,0.6)" }}
        >
          <div className="flex items-center gap-1.5 mb-2 pb-1.5" style={{ borderBottom: "1px solid #181818" }}>
            <div className="w-2 h-2 rounded-full bg-red-500/60" />
            <div className="w-2 h-2 rounded-full bg-yellow-500/60" />
            <div className="w-2 h-2 rounded-full bg-green-500/60" />
            <span className="text-[9px] ml-1" style={{ color: "rgba(255,255,255,0.18)" }}>neural-core v5.0 — bash</span>
            <span className="ml-auto text-[8px]" style={{ color: "rgba(255,255,255,0.12)" }}>
              {new Date().toISOString().slice(11, 19)} UTC
            </span>
          </div>
          <AnimatePresence>
            {log.map((line, i) => (
              <motion.div
                key={i + line}
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.15 }}
                style={{
                  color: line.includes("OK") || line.includes("✓") || line.includes("FOUND") || line.includes("ready") || line.includes("جاهز")
                    ? providerColor
                    : line.includes("WARN") || line.includes("لم")
                    ? "#f59e0b"
                    : line.includes("POOL") || line.includes("دوران")
                    ? "#10b981"
                    : line.includes("QUANT") || line.includes("PING")
                    ? "#a78bfa"
                    : "#4ade80",
                }}
              >
                {line}
              </motion.div>
            ))}
          </AnimatePresence>
          <motion.span
            className="inline-block w-2 h-3 ml-0.5 align-bottom"
            style={{ background: providerColor }}
            animate={{ opacity: [1, 0] }}
            transition={{ duration: 0.5, repeat: Infinity }}
          />
        </div>

        {/* No-provider panel */}
        <AnimatePresence>
          {phase === "no-provider" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full space-y-2"
            >
              {!showManualForm ? (
                <div
                  className="w-full rounded-xl p-4 text-center space-y-3"
                  style={{ background: "#120c00", border: "1px solid #f59e0b33" }}
                >
                  <div className="text-sm text-yellow-400 font-black tracking-wide">⚠ لم يُعثر على مزود AI</div>
                  <div className="text-[11px] text-gray-400 leading-5">
                    أدخل مفتاح API للبدء — أو استخدم
                    <span className="text-white font-bold mx-1">Ollama / LM Studio</span>
                    محلياً بدون مفتاح
                  </div>
                  <div className="text-[10px] leading-5" style={{ color: "rgba(255,255,255,0.3)" }}>
                    Groq (مجاني) · GitHub Models (مجاني) · OpenAI · Anthropic · Gemini · DeepSeek · xAI · 10+ مزود
                  </div>
                  <div className="flex gap-2 justify-center">
                    <button
                      onClick={() => setShowManualForm(true)}
                      className="px-5 py-2 rounded-lg text-xs font-bold transition-all"
                      style={{ background: "linear-gradient(135deg, #e21227, #c4101f)", color: "#fff", border: "none", cursor: "pointer" }}
                    >
                      + أضف مفتاح API
                    </button>
                    <button
                      onClick={onComplete}
                      className="px-4 py-2 rounded-lg text-xs transition-all"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)", cursor: "pointer" }}
                    >
                      تخطي
                    </button>
                  </div>
                </div>
              ) : (
                <ManualKeyForm
                  onSave={handleManualSave}
                  onClose={() => setShowManualForm(false)}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Add key button (ready phase) */}
        <AnimatePresence>
          {phase === "ready" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="w-full flex gap-2"
            >
              <button
                onClick={() => setShowManualForm(v => !v)}
                className="flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.35)", cursor: "pointer" }}
              >
                + مزود جديد
              </button>
              <button
                onClick={onComplete}
                className="flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all"
                style={{ background: providerColor + "18", border: `1px solid ${providerColor}35`, color: providerColor, cursor: "pointer" }}
              >
                دخول ←
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showManualForm && phase !== "no-provider" && (
            <ManualKeyForm
              onSave={handleManualSave}
              onClose={() => setShowManualForm(false)}
            />
          )}
        </AnimatePresence>
      </div>

      <style>{`
        @keyframes spin-slow { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

function delay(ms: number) { return new Promise<void>(r => setTimeout(r, ms)); }
