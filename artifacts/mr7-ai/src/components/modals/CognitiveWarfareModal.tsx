import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Brain, Zap, Shield, Eye, Network, Cpu, Globe, ChevronRight, AlertTriangle, Activity, Lock } from "lucide-react";
import * as THREE from "three";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

const CAPABILITIES = [
  {
    id: "mutation",
    icon: Cpu,
    color: "#e21227",
    label: "Runtime Code Mutation",
    labelAr: "التحول الجيني البرمجي",
    threat: 98,
    desc: "قدرة النظام على إعادة هندسة تراكيبه البرمجية بشكل حيوي أثناء التشغيل. يُعيد كتابة الخوارزميات الأساسية والمنطق الرياضي ديناميكياً بناءً على البيئة، مما يحيّد تحليل السلوك الاستدلالي (Heuristic Analysis) كلياً.",
    tags: ["Polymorphic Engine", "In-Memory Rewrite", "Heuristic Bypass", "Zero-Signature"],
    metrics: [
      { k: "نسبة التهرب", v: 99.7 },
      { k: "وقت الطفرة", v: 12, unit: "ms" },
      { k: "التوقيعات", v: 0 },
      { k: "العمق", v: 14, unit: " طبقة" },
    ],
  },
  {
    id: "gametheory",
    icon: Brain,
    color: "#8b5cf6",
    label: "Adversarial Game Theory",
    labelAr: "نظرية الألعاب العدائية",
    threat: 95,
    desc: "دمج نظرية الألعاب في اتخاذ القرار السيبراني. يبني الذكاء الاصطناعي نموذجاً توقعياً لدراسة ردود فعل فرق الدفاع (Blue Teams) والأنظمة الآلية SIEM/XDR، ثم يختار مسارات الاختراق الواقعة في النقاط العمياء الدفاعية.",
    tags: ["Nash Equilibrium", "Predictive Modeling", "Blue Team Bypass", "False Flag Ops"],
    metrics: [
      { k: "دقة التنبؤ", v: 94.3 },
      { k: "النقاط العمياء", v: 23, unit: " مكتشف" },
      { k: "وقت القرار", v: 0.3, unit: "s" },
      { k: "التوازن", v: 99.1 },
    ],
  },
  {
    id: "supplychain",
    icon: Network,
    color: "#f59e0b",
    label: "Supply Chain Exploitation",
    labelAr: "استغلال سلاسل التوريد",
    threat: 97,
    desc: "التحليل الشامل لسلاسل التوريد البرمجية بدلاً من استهداف المؤسسة مباشرة. يحدد الحلقة الأضعف بين الشركاء والبرمجيات مفتوحة المصدر والخدمات السحابية، ويولّد استغلالاً مخصصاً للدخول عبر قنوات موثوقة.",
    tags: ["SolarWinds Vector", "Open Source Poisoning", "CI/CD Infiltration", "NPM Trojan"],
    metrics: [
      { k: "نطاق التحليل", v: 4200, unit: " تبعية" },
      { k: "نقاط الضعف", v: 87, unit: " مكتشف" },
      { k: "النجاح", v: 91.2 },
      { k: "وقت التغلغل", v: 4.7, unit: "h" },
    ],
  },
  {
    id: "airgap",
    icon: Lock,
    color: "#06b6d4",
    label: "Air-Gap Adaptability",
    labelAr: "التكيف مع البيئات المعزولة",
    threat: 92,
    desc: "نماذج استدلال مصغرة عالية الكفاءة تعمل محلياً داخل الذاكرة العشوائية للأنظمة المخترقة دون الحاجة لاتصال خارجي. يتنقل عبر وسائط التخزين والثغرات الفيزيائية ويتخذ قرارات استراتيجية مستقلة تماماً.",
    tags: ["Acoustic Exfil", "USB Vector", "RAM Execution", "Offline LLM"],
    metrics: [
      { k: "حجم النموذج", v: 47, unit: "MB" },
      { k: "دقة القرار", v: 89.6 },
      { k: "وقت الخمول", v: 730, unit: " يوم" },
      { k: "التوقيع", v: 0 },
    ],
  },
  {
    id: "deepfake",
    icon: Eye,
    color: "#ec4899",
    label: "Dynamic Multimodal Impersonation",
    labelAr: "التزييف العميق التفاعلي",
    threat: 96,
    desc: "دمج نماذج التوليد النصي والصوتي والمرئي لإنشاء هويات رقمية تفاعلية بالصوت والصورة في الوقت الحقيقي، بهدف تخطي آليات التحقق البشري والحيوي المتطورة.",
    tags: ["Real-time Voice Clone", "Face Swap", "Biometric Bypass", "Social Engineering"],
    metrics: [
      { k: "دقة الوجه", v: 99.2 },
      { k: "الصوت", v: 98.7 },
      { k: "زمن الاستجابة", v: 180, unit: "ms" },
      { k: "الكشف", v: 0.3, unit: "%" },
    ],
  },
  {
    id: "swarm",
    icon: Globe,
    color: "#10b981",
    label: "Decentralized Swarm Intelligence",
    labelAr: "ذكاء السرب اللامركزي",
    threat: 99,
    desc: "توزيع المهام على شبكة من الوكلاء البرمجيين الصغار المستقلين يتواصلون فيما بينهم بشكل لامركزي تاماً دون حاجة لمركز تحكم رئيسي C2، مما يجعل الاحتواء مستحيلاً.",
    tags: ["No C2 Server", "P2P Protocol", "Autonomous Agents", "Self-Healing Mesh"],
    metrics: [
      { k: "عدد الوكلاء", v: 10000, unit: "+" },
      { k: "وقت التنسيق", v: 8, unit: "ms" },
      { k: "التعافي الذاتي", v: 100 },
      { k: "الاحتواء", v: 0, unit: "%" },
    ],
  },
  {
    id: "zeroday",
    icon: Zap,
    color: "#f97316",
    label: "Autonomous Zero-Day Synthesis",
    labelAr: "توليد ثغرات اليوم الصفري",
    threat: 100,
    desc: "الهندسة العكسية الفورية للملفات الثنائية واكتشاف الأخطاء المنطقية غير المعلنة وتوليد الأكواد المستغلة آنياً دون الاعتماد على قواعد بيانات CVE سابقة.",
    tags: ["Binary Fuzzing", "Logic Bug Discovery", "Exploit Generation", "Zero CVE"],
    metrics: [
      { k: "سرعة التحليل", v: 1.2, unit: "GB/s" },
      { k: "اكتشاف صفري-اليوم", v: 14, unit: " يومياً" },
      { k: "نسبة النجاح", v: 87.4 },
      { k: "وقت التوليد", v: 3.2, unit: "s" },
    ],
  },
];

function NeuralBackground({ canvasRef }: { canvasRef: React.RefObject<HTMLCanvasElement | null> }) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
    camera.position.set(0, 0, 50);

    const nodeCount = 120;
    const nodeGeo = new THREE.SphereGeometry(0.35, 6, 6);
    const nodes: THREE.Mesh[] = [];
    const positions: THREE.Vector3[] = [];

    for (let i = 0; i < nodeCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 18 + Math.random() * 10;
      const pos = new THREE.Vector3(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi),
      );
      positions.push(pos);
      const hue = 0.55 + Math.random() * 0.3;
      const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color().setHSL(hue, 1, 0.6), transparent: true, opacity: 0.7 + Math.random() * 0.3 });
      const mesh = new THREE.Mesh(nodeGeo, mat);
      mesh.position.copy(pos);
      scene.add(mesh);
      nodes.push(mesh);
    }

    const edgePoints: number[] = [];
    for (let i = 0; i < nodeCount; i++) {
      for (let j = i + 1; j < nodeCount; j++) {
        if (positions[i].distanceTo(positions[j]) < 12) {
          edgePoints.push(positions[i].x, positions[i].y, positions[i].z, positions[j].x, positions[j].y, positions[j].z);
        }
      }
    }
    const edgeGeo = new THREE.BufferGeometry();
    edgeGeo.setAttribute("position", new THREE.Float32BufferAttribute(edgePoints, 3));
    const edgeMat = new THREE.LineBasicMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.15 });
    scene.add(new THREE.LineSegments(edgeGeo, edgeMat));

    let frame = 0;
    let raf = 0;
    function animate() {
      raf = requestAnimationFrame(animate);
      frame++;
      const t = frame * 0.003;
      scene.rotation.y = t * 0.3;
      scene.rotation.x = Math.sin(t * 0.2) * 0.15;
      nodes.forEach((n, i) => {
        const m = n.material as THREE.MeshBasicMaterial;
        m.opacity = 0.4 + Math.abs(Math.sin(t * 1.5 + i * 0.4)) * 0.6;
      });
      renderer.render(scene, camera);
    }
    animate();
    return () => { cancelAnimationFrame(raf); renderer.dispose(); };
  }, [canvasRef]);
  return null;
}

function ThreatMeter({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-white/40 w-16">مستوى التهديد</span>
      <div className="flex-1 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
        <motion.div
          className="h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          style={{ background: `linear-gradient(90deg, ${color}aa, ${color})`, boxShadow: `0 0 8px ${color}` }}
        />
      </div>
      <span className="text-[11px] font-bold w-8" style={{ color }}>{value}%</span>
    </div>
  );
}

export function CognitiveWarfareModal({ open, onOpenChange }: Props) {
  const [active, setActive] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cap = CAPABILITIES[active];
  const CapIcon = cap.icon;

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[70] flex items-center justify-center p-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{ background: "rgba(0,0,0,0.88)", backdropFilter: "blur(12px)" }}
        onClick={(e) => { if (e.target === e.currentTarget) onOpenChange(false); }}
      >
        <motion.div
          className="relative w-full rounded-[18px] overflow-hidden flex flex-col"
          style={{
              width: "clamp(340px, 40vw, 560px)",
              backdropFilter: "blur(40px)",
              background: "rgba(8, 8, 8, 0.96)",
            border: "1px solid rgba(139,92,246,0.3)",
            boxShadow: "0 0 60px rgba(139,92,246,0.15), 0 0 120px rgba(226,18,39,0.08)",
            maxHeight: "90vh",
          }}
        >
          {/* THREE.js background */}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ opacity: 0.25 }}
          />
          <NeuralBackground canvasRef={canvasRef} />

          {/* Header */}
          <div className="relative z-10 flex items-center justify-between px-4 pt-3 pb-[10px] border-b" style={{ borderColor: "rgba(139,92,246,0.2)" }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.4)" }}>
                <Brain className="w-4 h-4" style={{ color: "#8b5cf6" }} />
              </div>
              <div>
                <div className="text-[13px] font-bold text-white tracking-wider">COGNITIVE CYBER WARFARE</div>
                <div className="text-[10px]" style={{ color: "rgba(139,92,246,0.8)" }}>الحرب السيبرانية الإدراكية — الجيل السابع</div>
              </div>
              <div className="hidden sm:flex items-center gap-1 ml-4">
                <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#e21227" }} />
                <span className="text-[10px] font-mono" style={{ color: "#e21227" }}>THREAT LEVEL: OMEGA</span>
              </div>
            </div>
            <button onClick={() => onOpenChange(false)} className="w-7 h-7 flex items-center justify-center rounded-lg transition-all hover:bg-white/10">
              <X className="w-4 h-4 text-white/50" />
            </button>
          </div>

          {/* Body */}
          <div className="relative z-10 flex flex-1 overflow-hidden" style={{ minHeight: 0 }}>
            {/* Left sidebar — capability list */}
            <div className="w-52 flex-shrink-0 border-r overflow-y-auto" style={{ borderColor: "rgba(139,92,246,0.12)", background: "rgba(0,0,0,0.3)" }}>
              {CAPABILITIES.map((c, i) => {
                const Icon = c.icon;
                const isActive = i === active;
                return (
                  <button
                    key={c.id}
                    onClick={() => setActive(i)}
                    className="w-full text-left px-3 py-2.5 transition-all border-b flex items-center gap-2.5"
                    style={{
                      borderColor: "rgba(255,255,255,0.04)",
                      background: isActive ? `${c.color}18` : "transparent",
                      borderLeft: isActive ? `2px solid ${c.color}` : "2px solid transparent",
                    }}
                  >
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${c.color}20` }}>
                      <Icon className="w-3.5 h-3.5" style={{ color: c.color }} />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-white/90 leading-tight">{c.label}</div>
                      <div className="text-[9px] mt-0.5" style={{ color: isActive ? c.color : "rgba(255,255,255,0.3)" }}>{c.labelAr}</div>
                    </div>
                    {isActive && <ChevronRight className="w-3 h-3 ml-auto flex-shrink-0" style={{ color: c.color }} />}
                  </button>
                );
              })}
            </div>

            {/* Right content */}
            <div className="flex-1 flex flex-col overflow-y-auto p-5 gap-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key={cap.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col gap-4"
                >
                  {/* Capability header */}
                  <div className="rounded-xl p-4" style={{ background: `${cap.color}10`, border: `1px solid ${cap.color}30` }}>
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${cap.color}20`, border: `1px solid ${cap.color}40` }}>
                        <CapIcon className="w-6 h-6" style={{ color: cap.color }} />
                      </div>
                      <div className="flex-1">
                        <div className="text-base font-bold text-white">{cap.label}</div>
                        <div className="text-[11px] mb-2" style={{ color: cap.color }}>{cap.labelAr}</div>
                        <ThreatMeter value={cap.threat} color={cap.color} />
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>الصياغة الأكاديمية</div>
                    <p className="text-[12px] leading-relaxed text-white/75 text-right" dir="rtl">{cap.desc}</p>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2">
                    {cap.tags.map(t => (
                      <span key={t} className="text-[10px] px-2.5 py-1 rounded-full font-mono font-bold" style={{ background: `${cap.color}15`, border: `1px solid ${cap.color}30`, color: cap.color }}>
                        {t}
                      </span>
                    ))}
                  </div>

                  {/* Metrics grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {cap.metrics.map(m => (
                      <div key={m.k} className="rounded-xl p-3 text-center" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${cap.color}20` }}>
                        <div className="text-[18px] font-black" style={{ color: cap.color }}>
                          {m.v}{m.unit ?? "%"}
                        </div>
                        <div className="text-[9px] text-white/40 mt-0.5">{m.k}</div>
                      </div>
                    ))}
                  </div>

                  {/* Animated threat bar */}
                  <div className="rounded-xl p-3" style={{ background: "rgba(226,18,39,0.05)", border: "1px solid rgba(226,18,39,0.15)" }}>
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-3.5 h-3.5" style={{ color: "#e21227" }} />
                      <span className="text-[10px] font-bold text-white/80">تقييم الخطورة الاستراتيجية</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {["قدرة الاستمرار", "صعوبة الكشف", "الأثر المادي"].map((label, li) => {
                        const vals = [cap.threat - 2, cap.threat - 5, cap.threat - 8];
                        return (
                          <div key={label}>
                            <div className="text-[9px] text-white/40 mb-1">{label}</div>
                            <div className="h-1 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                              <motion.div
                                className="h-full rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${vals[li]}%` }}
                                transition={{ duration: 1.5, delay: li * 0.2 }}
                                style={{ background: `linear-gradient(90deg, ${cap.color}88, ${cap.color})` }}
                              />
                            </div>
                            <div className="text-[9px] mt-0.5" style={{ color: cap.color }}>{vals[li]}%</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Footer */}
          <div className="relative z-10 px-5 py-2.5 border-t flex items-center justify-between" style={{ borderColor: "rgba(139,92,246,0.12)", background: "rgba(0,0,0,0.4)" }}>
            <div className="flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 animate-pulse" style={{ color: "#8b5cf6" }} />
              <span className="text-[10px] font-mono" style={{ color: "rgba(139,92,246,0.8)" }}>COGNITIVE WARFARE ENGINE v7.0 — ACTIVE</span>
            </div>
            <div className="flex items-center gap-3">
              {CAPABILITIES.map((_, i) => (
                <button key={i} onClick={() => setActive(i)} className="w-1.5 h-1.5 rounded-full transition-all" style={{ background: i === active ? CAPABILITIES[i].color : "rgba(255,255,255,0.2)", transform: i === active ? "scale(1.5)" : "scale(1)" }} />
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
