import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";

// ── Provider priority + best model per provider ──────────────────────────────
const PROVIDER_PRIORITY: Array<{
  id: string;
  name: string;
  color: string;
  baseURL: string;
  bestModel: string;
  bestModelLabel: string;
  requiresKey: boolean;
}> = [
  { id: "groq",       name: "Groq",          color: "#8b5cf6", baseURL: "https://api.groq.com/openai/v1",                             bestModel: "llama-3.3-70b-versatile",        bestModelLabel: "Llama 3.3 70B",        requiresKey: true },
  { id: "openai",     name: "OpenAI",        color: "#10b981", baseURL: "https://api.openai.com/v1",                                  bestModel: "gpt-4o",                         bestModelLabel: "GPT-4o",               requiresKey: true },
  { id: "anthropic",  name: "Anthropic",     color: "#f59e0b", baseURL: "https://api.anthropic.com/v1",                               bestModel: "claude-sonnet-4-5",              bestModelLabel: "Claude Sonnet 4.5",    requiresKey: true },
  { id: "gemini",     name: "Google Gemini", color: "#3b82f6", baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",    bestModel: "gemini-2.5-flash",               bestModelLabel: "Gemini 2.5 Flash",     requiresKey: true },
  { id: "openrouter", name: "OpenRouter",    color: "#ef4444", baseURL: "https://openrouter.ai/api/v1",                               bestModel: "deepseek/deepseek-chat-v3-0324", bestModelLabel: "DeepSeek V3",          requiresKey: true },
  { id: "deepseek",   name: "DeepSeek",      color: "#f97316", baseURL: "https://api.deepseek.com/v1",                                bestModel: "deepseek-chat",                  bestModelLabel: "DeepSeek V3 Direct",   requiresKey: true },
  { id: "xai",        name: "xAI Grok",      color: "#06b6d4", baseURL: "https://api.x.ai/v1",                                       bestModel: "grok-3-mini",                    bestModelLabel: "Grok 3 Mini",          requiresKey: true },
  { id: "mistral",    name: "Mistral AI",    color: "#ec4899", baseURL: "https://api.mistral.ai/v1",                                  bestModel: "mistral-large-latest",           bestModelLabel: "Mistral Large",        requiresKey: true },
  { id: "ollama",     name: "Ollama",        color: "#22c55e", baseURL: "http://localhost:11434/v1",                                  bestModel: "llama3.2",                       bestModelLabel: "Llama 3.2 (Local)",    requiresKey: false },
  { id: "lmstudio",   name: "LM Studio",    color: "#a78bfa", baseURL: "http://localhost:1234/v1",                                   bestModel: "local-model",                    bestModelLabel: "Local Model",          requiresKey: false },
];

const KEY_PREFIX = "mr7-ai-p-key-";
const URL_PREFIX = "mr7-ai-p-url-";
const INIT_DONE_KEY = "mr7-ai-autoinit-done";

type Phase = "boot" | "scanning" | "found" | "loading" | "ready" | "no-provider";

function detectConfiguredProvider() {
  for (const p of PROVIDER_PRIORITY) {
    if (p.requiresKey) {
      const key = localStorage.getItem(KEY_PREFIX + p.id)?.trim();
      if (key && key.length > 10) {
        const url = localStorage.getItem(URL_PREFIX + p.id)?.trim() || p.baseURL;
        return { ...p, key, url };
      }
    } else {
      // local providers are always "available"
      return { ...p, key: "", url: p.baseURL };
    }
  }
  return null;
}

// ── 3D Neural Sphere Canvas ──────────────────────────────────────────────────
function NeuralSphere3D({
  phase,
  providerColor,
}: {
  phase: Phase;
  providerColor: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const tRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.width = canvas.offsetWidth;
    const H = canvas.height = canvas.offsetHeight;
    const cx = W / 2, cy = H / 2;
    const R = Math.min(W, H) * 0.32;

    const isReady = phase === "ready";
    const isScanning = phase === "scanning" || phase === "found" || phase === "loading";

    // Nodes on sphere surface (Fibonacci lattice)
    const nodeCount = 48;
    const nodes = Array.from({ length: nodeCount }, (_, i) => {
      const phi = Math.acos(1 - (2 * (i + 0.5)) / nodeCount);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      return {
        x: Math.sin(phi) * Math.cos(theta),
        y: Math.sin(phi) * Math.sin(theta),
        z: Math.cos(phi),
        pulseOffset: Math.random() * Math.PI * 2,
      };
    });

    // Edge pairs (connect nearby nodes)
    const edges: [number, number][] = [];
    for (let i = 0; i < nodeCount; i++) {
      for (let j = i + 1; j < nodeCount; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const dz = nodes[i].z - nodes[j].z;
        if (Math.sqrt(dx*dx + dy*dy + dz*dz) < 0.72) edges.push([i, j]);
      }
    }

    // Particles
    const particles = Array.from({ length: 80 }, () => ({
      angle: Math.random() * Math.PI * 2,
      orbit: R * (0.7 + Math.random() * 0.9),
      speed: (0.003 + Math.random() * 0.006) * (Math.random() > 0.5 ? 1 : -1),
      y: (Math.random() - 0.5) * R * 1.4,
      size: 1 + Math.random() * 2,
      alpha: 0.3 + Math.random() * 0.6,
    }));

    function draw() {
      tRef.current += 0.012;
      const t = tRef.current;
      ctx.clearRect(0, 0, W, H);

      const rotY = t * 0.4;
      const rotX = Math.sin(t * 0.15) * 0.3;
      const sinY = Math.sin(rotY), cosY = Math.cos(rotY);
      const sinX = Math.sin(rotX), cosX = Math.cos(rotX);

      // Project 3D node → 2D
      const proj = nodes.map(n => {
        let x = n.x, y = n.y, z = n.z;
        // Rotate Y
        const x1 = x * cosY - z * sinY;
        const z1 = x * sinY + z * cosY;
        // Rotate X
        const y2 = y * cosX - z1 * sinX;
        const z2 = y * sinX + z1 * cosX;
        const scale = R / (1.6 - z2 * 0.4);
        return {
          sx: cx + x1 * scale,
          sy: cy + y2 * scale,
          depth: z2,
          pulse: Math.sin(t * 2 + n.pulseOffset) * 0.5 + 0.5,
        };
      });

      // Draw edges
      const base = isReady ? providerColor : "#e21227";
      edges.forEach(([a, b]) => {
        const pa = proj[a], pb = proj[b];
        const avgDepth = (pa.depth + pb.depth) / 2;
        const alpha = isScanning
          ? (0.08 + (avgDepth + 1) * 0.12) * (0.6 + Math.sin(t * 3 + a * 0.5) * 0.3)
          : 0.06 + (avgDepth + 1) * 0.10;
        ctx.beginPath();
        ctx.moveTo(pa.sx, pa.sy);
        ctx.lineTo(pb.sx, pb.sy);
        ctx.strokeStyle = base + Math.floor(alpha * 255).toString(16).padStart(2, "0");
        ctx.lineWidth = 0.8;
        ctx.stroke();
      });

      // Draw nodes
      proj.forEach(p => {
        const brightness = (p.depth + 1) / 2;
        const r = (isScanning ? 2.5 + p.pulse * 1.5 : 2) * brightness;
        const alpha = isReady ? 0.7 + p.pulse * 0.3 : 0.3 + brightness * 0.5;
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, r, 0, Math.PI * 2);
        ctx.fillStyle = base + Math.floor(alpha * 255).toString(16).padStart(2, "0");
        ctx.fill();
        if (isScanning && p.pulse > 0.8) {
          ctx.beginPath();
          ctx.arc(p.sx, p.sy, r * 2.5, 0, Math.PI * 2);
          ctx.fillStyle = base + "22";
          ctx.fill();
        }
      });

      // Outer ring
      const ringAlpha = isScanning ? 0.25 + Math.sin(t * 2) * 0.1 : 0.12;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.18, 0, Math.PI * 2);
      ctx.strokeStyle = base + Math.floor(ringAlpha * 255).toString(16).padStart(2, "0");
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Scan ring
      if (isScanning) {
        const sweep = ((t * 1.2) % (Math.PI * 2));
        ctx.beginPath();
        ctx.arc(cx, cy, R * 1.18, sweep, sweep + 1.2);
        ctx.strokeStyle = base + "cc";
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Particles
      particles.forEach(p => {
        p.angle += p.speed;
        const px = cx + Math.cos(p.angle) * Math.sqrt(p.orbit * p.orbit - p.y * p.y * 0.3);
        const py = cy + p.y + Math.sin(p.angle) * p.orbit * 0.18;
        ctx.beginPath();
        ctx.arc(px, py, p.size * (isReady ? 1.3 : 0.8), 0, Math.PI * 2);
        ctx.fillStyle = base + Math.floor(p.alpha * (isReady ? 200 : 120)).toString(16).padStart(2, "0");
        ctx.fill();
      });

      // Core glow
      const glowR = R * (0.18 + Math.sin(t * 1.5) * 0.04);
      const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
      grd.addColorStop(0, base + "66");
      grd.addColorStop(0.6, base + "22");
      grd.addColorStop(1, base + "00");
      ctx.beginPath();
      ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.fill();

      // Ready pulse rings
      if (isReady) {
        for (let i = 0; i < 3; i++) {
          const pr = R * (0.5 + ((t * 0.7 + i * 0.8) % 1.5));
          const pa = Math.max(0, 0.4 - pr / R * 0.3);
          ctx.beginPath();
          ctx.arc(cx, cy, pr, 0, Math.PI * 2);
          ctx.strokeStyle = base + Math.floor(pa * 255).toString(16).padStart(2, "0");
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [phase, providerColor]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ display: "block" }}
    />
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export function AIAutoSetup3D({ onComplete }: { onComplete: () => void }) {
  const { state, dispatch } = useStore();
  const { toast } = useToast();
  const [phase, setPhase] = useState<Phase>("boot");
  const [log, setLog] = useState<string[]>([]);
  const [detectedProvider, setDetectedProvider] = useState<(typeof PROVIDER_PRIORITY[0] & { key: string; url: string }) | null>(null);
  const [progress, setProgress] = useState(0);
  const doneRef = useRef(false);

  const addLog = useCallback((msg: string) => {
    setLog(prev => [...prev.slice(-6), msg]);
  }, []);

  useEffect(() => {
    if (doneRef.current) return;
    doneRef.current = true;

    const run = async () => {
      // Boot
      setPhase("boot");
      addLog("[ KaliGPT ] تهيئة نواة الذكاء الاصطناعي...");
      await delay(600);
      addLog("[ SYS ] فحص طبقة التشفير...");
      await delay(400);
      setProgress(10);

      // Scan
      setPhase("scanning");
      addLog("[ SCAN ] البحث عن مزودي الذكاء الاصطناعي...");
      await delay(500);
      setProgress(30);

      const PROVIDERS_TO_SCAN = [
        "groq", "openai", "anthropic", "gemini", "openrouter",
        "deepseek", "xai", "mistral", "together", "fireworks",
        "cohere", "nvidia", "github", "ollama", "lmstudio",
      ];

      for (const pid of PROVIDERS_TO_SCAN) {
        addLog(`[ SCAN ] فحص ${pid}...`);
        await delay(60);
      }
      setProgress(55);

      const found = detectConfiguredProvider();

      if (!found) {
        // Also check personal API key in state
        const personalKey = state.settings?.personalApiKey?.trim();
        if (personalKey && personalKey.length > 10) {
          addLog("[ FOUND ] المفتاح الشخصي محدد");
          setDetectedProvider({
            id: "personal",
            name: "Personal API",
            color: "#e21227",
            baseURL: state.settings?.personalApiBaseURL || "https://api.openai.com/v1",
            bestModel: "gpt-4o",
            bestModelLabel: "GPT-4o",
            requiresKey: false,
            key: personalKey,
            url: state.settings?.personalApiBaseURL || "https://api.openai.com/v1",
          });
          await continueWithPersonal(personalKey, state.settings?.personalApiBaseURL);
          return;
        }

        setPhase("no-provider");
        addLog("[ WARN ] لم يتم العثور على مفتاح API مضبوط");
        addLog("[ INFO ] افتح إعدادات الذكاء الاصطناعي لإضافة مفتاح");
        setProgress(100);
        return;
      }

      // Found provider
      setPhase("found");
      setDetectedProvider(found);
      addLog(`[ FOUND ] تم اكتشاف: ${found.name}`);
      setProgress(65);
      await delay(400);

      // Loading model
      setPhase("loading");
      addLog(`[ MODEL ] تحميل نموذج: ${found.bestModelLabel}...`);
      setProgress(78);
      await delay(300);

      addLog(`[ MODEL ] ضبط المعاملات...`);
      setProgress(88);
      await delay(250);

      // Dispatch to store
      dispatch({
        type: "SET_PROVIDER",
        provider: found.id as never,
        providerModel: found.bestModel,
      });
      dispatch({ type: "SET_MODEL", model: found.bestModelLabel });

      addLog(`[ OK ] النظام جاهز — ${found.name} / ${found.bestModelLabel}`);
      setProgress(100);
      setPhase("ready");
      await delay(1200);

      toast({
        description: `تم تفعيل ${found.name} — ${found.bestModelLabel} تلقائياً`,
      });

      await delay(600);
      onComplete();
    };

    async function continueWithPersonal(key: string, baseURL?: string) {
      setPhase("loading");
      addLog("[ MODEL ] تحميل النموذج الشخصي...");
      setProgress(80);
      await delay(300);
      dispatch({ type: "SET_PROVIDER", provider: "personal" as never, providerModel: "gpt-4o" });
      dispatch({ type: "SET_MODEL", model: "CHAT-GPT Fast" });
      setProgress(100);
      setPhase("ready");
      addLog("[ OK ] النظام جاهز — Personal API");
      await delay(1200);
      toast({ description: "تم تفعيل المفتاح الشخصي تلقائياً" });
      await delay(600);
      onComplete();
    }

    run();
  }, []);

  const providerColor = detectedProvider?.color ?? "#e21227";

  const PHASE_LABELS: Record<Phase, string> = {
    boot:          "تشغيل النظام",
    scanning:      "فحص المزودين",
    found:         "تم الاكتشاف",
    loading:       "تحميل النموذج",
    ready:         "النظام جاهز",
    "no-provider": "لا يوجد مزود",
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.96)" }}
    >
      {/* Background grid */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage:
            `linear-gradient(${providerColor}33 1px, transparent 1px),` +
            `linear-gradient(90deg, ${providerColor}33 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }}
      />

      {/* Scan lines */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)",
        }}
      />

      <div className="relative flex flex-col items-center gap-6 w-full max-w-md px-6">
        {/* 3D Sphere */}
        <motion.div
          className="relative"
          style={{ width: 240, height: 240 }}
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <NeuralSphere3D phase={phase} providerColor={providerColor} />

          {/* Center status */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <AnimatePresence mode="wait">
              <motion.div
                key={phase}
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.2 }}
                transition={{ duration: 0.3 }}
                className="text-center"
              >
                {phase === "ready" ? (
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold"
                    style={{
                      background: `radial-gradient(circle, ${providerColor}44, transparent)`,
                      border: `2px solid ${providerColor}`,
                      color: providerColor,
                      boxShadow: `0 0 20px ${providerColor}66`,
                    }}
                  >
                    ✓
                  </div>
                ) : phase === "no-provider" ? (
                  <div className="text-2xl" style={{ color: "#f59e0b" }}>⚠</div>
                ) : (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                    className="w-10 h-10 rounded-full border-2 border-t-transparent"
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
          <div
            className="text-xs font-bold tracking-[0.4em] uppercase mb-1"
            style={{ color: providerColor }}
          >
            KaliGPT — NEURAL CORE
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={phase}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              className="text-white text-lg font-bold"
            >
              {PHASE_LABELS[phase]}
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* Progress bar */}
        <div className="w-full h-[2px] bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: providerColor }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>

        {/* Provider badge */}
        <AnimatePresence>
          {detectedProvider && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold"
              style={{
                background: detectedProvider.color + "18",
                border: `1px solid ${detectedProvider.color}44`,
                color: detectedProvider.color,
              }}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{
                  background: detectedProvider.color,
                  boxShadow: `0 0 6px ${detectedProvider.color}`,
                  animation: "pulse 1.2s ease-in-out infinite",
                }}
              />
              {detectedProvider.name} — {detectedProvider.bestModelLabel}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Terminal log */}
        <div
          className="w-full rounded-lg p-3 font-mono text-[11px] space-y-0.5 min-h-[100px]"
          style={{
            background: "#0a0a0a",
            border: "1px solid #1f1f1f",
          }}
        >
          <AnimatePresence>
            {log.map((line, i) => (
              <motion.div
                key={i + line}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
                style={{
                  color: line.includes("FOUND") || line.includes("OK")
                    ? providerColor
                    : line.includes("WARN")
                    ? "#f59e0b"
                    : "#4ade80",
                }}
              >
                {line}
              </motion.div>
            ))}
          </AnimatePresence>
          {/* Blinking cursor */}
          <motion.span
            className="inline-block w-2 h-3 ml-1"
            style={{ background: providerColor }}
            animate={{ opacity: [1, 0] }}
            transition={{ duration: 0.6, repeat: Infinity }}
          />
        </div>

        {/* No-provider instructions */}
        <AnimatePresence>
          {phase === "no-provider" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full rounded-lg p-4 text-center space-y-2"
              style={{ background: "#1a1a0a", border: "1px solid #f59e0b33" }}
            >
              <div className="text-sm text-yellow-400 font-semibold">لم يتم العثور على مزود AI</div>
              <div className="text-xs text-gray-400 leading-5">
                افتح إعدادات الذكاء الاصطناعي من زر
                <span className="text-white font-bold mx-1">⚙ AI</span>
                في الشريط العلوي، أدخل مفتاح API الخاص بك ثم ستبدأ الدردشة تلقائياً
              </div>
              <div className="text-xs text-gray-500">
                يدعم: Groq (مجاني) · OpenAI · Anthropic · Gemini · OpenRouter و 20+ مزود آخر
              </div>
              <button
                onClick={onComplete}
                className="mt-2 px-4 py-1.5 rounded text-xs font-semibold transition-all"
                style={{
                  background: "#e2122722",
                  border: "1px solid #e2122755",
                  color: "#e21227",
                }}
              >
                متابعة بدون مزود
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}

function delay(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}
