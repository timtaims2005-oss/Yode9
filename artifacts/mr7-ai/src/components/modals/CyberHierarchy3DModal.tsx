import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, AlertTriangle, Shield, Zap, Radio, Terminal, Lock, Cpu, Satellite, Brain, Atom, Network, Globe, Eye, Dna, Wifi, Activity } from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════════
   CYBER HIERARCHY 3D MODAL — EXTENDED SUPREME EDITION
   هرم الخطر السيبراني — الإصدار المتقدم الشامل
   WebGL + THREE.js | DPR×4 | 120fps | ACESFilmicToneMapping
═══════════════════════════════════════════════════════════════════════ */

interface CyberHierarchy3DModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const LEVELS = [
  {
    id: 0, rank: 1,
    name: "Kali Linux",
    label: "المستوى الأول",
    sub: "توزيعة الاختراق القياسية",
    color: "#00ff41", emissive: "#00cc33",
    glow: "rgba(0,255,65,",
    icon: Terminal,
    dangerPct: 15,
    desc: "بيئة اختراق جاهزة لاختبار الشبكات والمواقع. الأكثر شيوعاً بين المحترفين. تحتوي على 600+ أداة أمنية مجانية ومفتوحة المصدر.",
    tags: ["Metasploit", "Nmap", "Burp Suite", "Wireshark"],
    threat: "شبكات • مواقع • أنظمة",
  },
  {
    id: 1, rank: 2,
    name: "BlackArch Linux",
    label: "المستوى الثاني",
    sub: "ترسانة الهجوم الشاملة",
    color: "#3b82f6", emissive: "#1d4ed8",
    glow: "rgba(59,130,246,",
    icon: Shield,
    dangerPct: 28,
    desc: "ترسانة ضخمة بـ 2800+ أداة تغطي جميع أنواع الهجوم. مبنية على Arch Linux لمرونة أقصى. للمحترفين الذين يريدون سيطرة كاملة على النظام.",
    tags: ["2800+ Tool", "AUR Packages", "Full Arsenal", "Black Box"],
    threat: "هجمات شاملة • متخصصة",
  },
  {
    id: 2, rank: 3,
    name: "DragonOS / SDR",
    label: "المستوى الثالث",
    sub: "اختراق العالم الفيزيائي",
    color: "#f97316", emissive: "#c2410c",
    glow: "rgba(249,115,22,",
    icon: Radio,
    dangerPct: 42,
    desc: "اختراق الترددات اللاسلكية، الأقمار الصناعية، GPS، وإشارات الطائرات. يعمل على Raspberry Pi. يمكنه GPS Spoofing لإيهام سفن وطائرات بمواقع وهمية.",
    tags: ["GPS Spoofing", "RF Intercept", "Satellite", "SDR Hardware"],
    threat: "راديو • أقمار • طائرات • GPS",
  },
  {
    id: 3, rank: 4,
    name: "Custom LFS",
    label: "المستوى الرابع",
    sub: "الاختفاء التام والبصمة الصفرية",
    color: "#e21227", emissive: "#991b1b",
    glow: "rgba(226,18,39,",
    icon: Lock,
    dangerPct: 58,
    desc: "أخطر الهاكرز يبنون نظامهم من الصفر (Linux From Scratch). لا توجد بصمة رقمية في أي قاعدة بيانات أمنية. أدوات مخصصة بـ C++ أو Python مجهولة الهوية تماماً.",
    tags: ["Zero Signature", "LFS Build", "Custom Tools", "Invisible"],
    threat: "تخفي مطلق • لا يمكن اكتشافه",
  },
  {
    id: 4, rank: 5,
    name: "Proprietary Exploit OS",
    label: "المستوى الخامس",
    sub: "Zero-Click • أسلحة الدول",
    color: "#00e5ff", emissive: "#0284c7",
    glow: "rgba(0,229,255,",
    icon: Satellite,
    dangerPct: 72,
    desc: "Pegasus و EternalBlue وما أعلى — أنظمة تُباع بملايين الدولارات للحكومات فقط. تخترق أحدث iPhone بمجرد رسالة صامتة لا يراها المستخدم. Zero-Click Exploits.",
    tags: ["Pegasus", "EternalBlue", "Zero-Click", "NSO Group"],
    threat: "اختراق هواتف صامت • حكومي",
  },
  {
    id: 5, rank: 6,
    name: "Agentic AI Hacking",
    label: "المستوى السادس",
    sub: "أنظمة الاختراق الذاتي بالذكاء الاصطناعي",
    color: "#ff6b35", emissive: "#cc4400",
    glow: "rgba(255,107,53,",
    icon: Brain,
    dangerPct: 84,
    desc: "ذكاء اصطناعي عميل يُعطى 'هدفاً' فقط — يفحص الملايين من أسطر الكود تلقائياً، يكتشف Zero-Days غير معروفة للبشر، يكتب Exploit، ينفذ الهجوم ويعدل نفسه بدون أي تدخل بشري في ثوانٍ معدودة.",
    tags: ["Project Glasswing", "Auto-Exploit", "Self-Modifying AI", "Zero-Days Gen"],
    threat: "ذكاء اصطناعي هجومي • مستقل",
  },
  {
    id: 6, rank: 7,
    name: "Quantum Cyber Weapons",
    label: "المستوى السابع",
    sub: "حواسب الكم الخارقة",
    color: "#a78bfa", emissive: "#6d28d9",
    glow: "rgba(167,139,250,",
    icon: Atom,
    dangerPct: 92,
    desc: "التشفير الذي يحمي البنوك وأسرار الدول (RSA, AES) يحتاج مليارات السنين للكسر بالحاسوب العادي. كمبيوتر كمومي قوي يكسره في دقائق — يجعله قادراً على قراءة أي بيانات مشفرة على الإنترنت لحظياً.",
    tags: ["RSA Breaking", "AES Decrypt", "Quantum Supremacy", "Q-Day"],
    threat: "كسر التشفير • قراءة كل شيء",
  },
  {
    id: 7, rank: 8,
    name: "Advanced C2 Frameworks",
    label: "المستوى الثامن",
    sub: "أنظمة السيطرة والتحكم العسكرية",
    color: "#ec4899", emissive: "#9d174d",
    glow: "rgba(236,72,153,",
    icon: Network,
    dangerPct: 96,
    desc: "Cobalt Strike ونسخه العسكرية السرية — يتخفى داخل العمليات الطبيعية للجهاز (تحديثات ويندوز، متصفح جوجل)، يجعل حركة مرور الهكر تبدو طبيعية 100%، ويبقى داخل أجهزة الضحايا لسنوات دون اكتشاف.",
    tags: ["Cobalt Strike", "Brute Ratel", "EDR Bypass", "Lateral Movement"],
    threat: "سيطرة كاملة • سنوات دون اكتشاف",
  },
  {
    id: 8, rank: 9,
    name: "Space-Cyber Integration",
    label: "المستوى التاسع — القمة المطلقة",
    sub: "اختراق الفضاء والأقمار الصناعية",
    color: "#fbbf24", emissive: "#b45309",
    glow: "rgba(251,191,36,",
    icon: Globe,
    dangerPct: 100,
    desc: "أقوى الهجمات انتقلت من الأرض إلى الفضاء. اختراق الأقمار الصناعية وشبكات الاتصال المدارية. القدرة على عزل دول كاملة، تزييف إشارات GPS للجيوش، وتدمير الأقمار من مدارها عبر برمجيات ذكاء اصطناعي مستقلة.",
    tags: ["Orbital Malware", "GPS Spoofing", "Satellite Hack", "Kinetic ASAT"],
    threat: "حروب فضائية • عزل دول كاملة",
  },
];

const WEAPONS = [
  {
    id: "pegasus", name: "PEGASUS",
    sub: "NSO Group — Zero-Click",
    color: "#00e5ff",
    desc: "يخترق iPhone وAndroid بدون أي تفاعل. صلاحيات Root مطلقة. يقرأ Signal وتيليغرام. تباع بـ 25M$.",
  },
  {
    id: "eternalblue", name: "ETERNALBLUE",
    sub: "NSA Shadow Brokers Leak",
    color: "#f97316",
    desc: "سرّبت Shadow Brokers ترسانة NSA. WannaCry استخدمه لشلّ مستشفيات ومطارات عالمياً في ساعات.",
  },
  {
    id: "stuxnet", name: "STUXNET",
    sub: "US+Israel — SCADA Killer",
    color: "#e21227",
    desc: "أول سلاح سيبراني يدمّر بنية تحتية فيزيائية. دمّر أجهزة الطرد المركزي الإيرانية عبر USB.",
  },
  {
    id: "glasswing", name: "PROJECT GLASSWING",
    sub: "Agentic AI — Level 6",
    color: "#ff6b35",
    desc: "نموذج ذكاء اصطناعي هجومي مستقل. يُعطى هدفاً فقط ويشن الهجوم الكامل ذاتياً في ثوانٍ. لا يحتاج هكر بشري.",
  },
  {
    id: "qday", name: "Q-DAY WEAPON",
    sub: "Quantum Computing — Level 7",
    color: "#a78bfa",
    desc: "كمبيوتر كمومي مخصص للاختراق يكسر RSA-2048 في دقائق. يقرأ جميع بيانات الإنترنت المشفرة لحظياً.",
  },
  {
    id: "orbitalmalware", name: "AUTONOMOUS ORBITAL",
    sub: "Space-Cyber — Level 9",
    color: "#fbbf24",
    desc: "برمجيات ذكاء اصطناعي تُزرع في الأقمار الصناعية العسكرية. تعمل بالكامل دون توجيه أرضي. تدمير وإخراج الأقمار من مداراتها.",
  },
];

const SUPREME_TIERS = [
  {
    tier: "A", name: "هجمات تسميم الذكاء الاصطناعي",
    en: "AI Data Poisoning Systems",
    color: "#ff6b35",
    items: [
      "تخريب بيانات تدريب نماذج الذكاء الاصطناعي العسكرية لجعلها ترى الهجمات كعمليات آمنة",
      "زرع Neural Backdoors — أبواب خلفية في الشبكة العصبية تُعطّل الدفاعات بكلمة سر واحدة",
    ],
  },
  {
    tier: "B", name: "الأسلحة السيبرانية-البيولوجية",
    en: "Cyber-Physical DNA Malware",
    color: "#e21227",
    items: [
      "اختراق أجهزة تسلسل الحمض النووي (DNA Synthesizers) لإنتاج فيروسات بيولوجية بدلاً من أدوية",
      "التلاعب بترددات رنين مراوح المفاعلات عبر SCADA لإحداث انفجارات فيزيائية",
    ],
  },
  {
    tier: "C", name: "هجمات القنوات الجانبية بالذكاء الاصطناعي",
    en: "AI-Driven Side-Channel Attacks",
    color: "#a78bfa",
    items: [
      "تحليل الموجات الكهرومغناطيسية والانبعاثات الحرارية وصوت مروحة المعالج من مسافة بعيدة",
      "استخراج كلمات السر والبيانات المشفرة من الأجهزة المعزولة تماماً عن الإنترنت بدقة 100%",
    ],
  },
  {
    tier: "D", name: "فيروسات UEFI/VBR المطلقة",
    en: "Firmware-Level Rootkits",
    color: "#00e5ff",
    items: [
      "زرع برمجيات خبيثة داخل شريحة BIOS/UEFI على اللوحة الأم — تعمل قبل بدء نظام التشغيل",
      "تبقى موجودة حتى بعد تغيير القرص الصلب كاملاً أو إعادة تثبيت نظام تشغيل جديد",
    ],
  },
  {
    tier: "E", name: "اختطاف مسارات الإنترنت العالمية",
    en: "BGP Hijacking Frameworks",
    color: "#fbbf24",
    items: [
      "اختراق بروتوكول BGP لتحويل حركة إنترنت دولة كاملة عبر خوادم المخترق",
      "قطع الإنترنت تماماً عن قارة أو دولة بضغطة زر واحدة",
    ],
  },
  {
    tier: "F", name: "التلاعب الجيني المشفر",
    en: "DNA Data Hacking",
    color: "#10b981",
    items: [
      "تشفير برمجيات خبيثة وتحويلها إلى تسلسلات DNA حقيقية — اختراق المختبر عند قراءة العينة",
      "السيطرة عن بُعد على طابعات الحمض النووي لتحويل اللقاحات إلى أسلحة بيولوجية",
    ],
  },
  {
    tier: "G", name: "أحصنة طروادة في المعالجات",
    en: "Microcode / Hardware Trojans",
    color: "#ec4899",
    items: [
      "زرع أبواب خلفية داخل Microcode معالجات Intel/AMD/ARM أثناء التصنيع — لا يمكن اكتشافها أبداً",
      "البرمجية تعمل كجزء فيزيائي من المعالج بصلاحيات أعلى من نظام التشغيل نفسه",
    ],
  },
  {
    tier: "H", name: "الاختراق بالطاقة الموجهة",
    en: "EMP & Directed Energy Hacking",
    color: "#f97316",
    items: [
      "موجات كهرومغناطيسية موجهة لتعطيل الأجهزة الحيوية المعزولة (Air-Gapped) من مسافات بعيدة",
      "حقن أوامر برمجية عبر إشارات ليزر أو موجات فوق صوتية في حساسات الجيروسكوب والضوء",
    ],
  },
  {
    tier: "I", name: "الجواسيس المداريون المستقلون",
    en: "Autonomous Orbital Malware",
    color: "#fbbf24",
    items: [
      "ذكاء اصطناعي هجومي مزروع في أقمار صناعية عسكرية — يعمل بدون توجيه أرضي كاملاً",
      "رصد الأقمار القريبة واختراق أنظمة دفعها الحراري لإخراجها من مدارها أو تدميرها بالاصطدام",
    ],
  },
];

export function CyberHierarchy3DModal({ open, onOpenChange }: CyberHierarchy3DModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const rafRef = useRef<number>(0);
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [selectedWeapon, setSelectedWeapon] = useState<string | null>(null);
  const [tab, setTab] = useState<"pyramid" | "weapons" | "supreme">("pyramid");
  const mouseRef = useRef({ x: 0, y: 0 });
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const groupRef = useRef<THREE.Group | null>(null);
  const platformRefs = useRef<THREE.Mesh[]>([]);
  const particlesRef = useRef<THREE.Points | null>(null);
  const weaponGroupsRef = useRef<THREE.Group[]>([]);
  const clockRef = useRef(new THREE.Clock());
  const [supremeTier, setSupremeTier] = useState<string | null>(null);

  const initScene = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const W = canvas.clientWidth, H = canvas.clientHeight;
    const dpr = Math.min(window.devicePixelRatio * 2, 4);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
    renderer.setPixelRatio(dpr);
    renderer.setSize(W, H, false);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.6;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x010206);
    scene.fog = new THREE.FogExp2(0x010206, 0.03);

    const camera = new THREE.PerspectiveCamera(55, W / H, 0.1, 300);
    camera.position.set(0, 4, 20);
    camera.lookAt(0, 4, 0);
    cameraRef.current = camera;

    scene.add(new THREE.AmbientLight(0x001122, 0.5));
    const hemi = new THREE.HemisphereLight(0x001133, 0x000000, 0.3);
    scene.add(hemi);

    const group = new THREE.Group();
    scene.add(group);
    groupRef.current = group;

    // Stars
    const starsGeo = new THREE.BufferGeometry();
    const starsCount = 12000;
    const starsPos = new Float32Array(starsCount * 3);
    const starsColor = new Float32Array(starsCount * 3);
    for (let i = 0; i < starsCount; i++) {
      const r = 100 + Math.random() * 80;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starsPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starsPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starsPos[i * 3 + 2] = r * Math.cos(phi);
      const t = Math.random();
      starsColor[i * 3] = t * 0.3 + 0.7;
      starsColor[i * 3 + 1] = t * 0.5 + 0.5;
      starsColor[i * 3 + 2] = 1.0;
    }
    starsGeo.setAttribute("position", new THREE.BufferAttribute(starsPos, 3));
    starsGeo.setAttribute("color", new THREE.BufferAttribute(starsColor, 3));
    const starsMat = new THREE.PointsMaterial({ size: 0.07, vertexColors: true, transparent: true, opacity: 0.85 });
    scene.add(new THREE.Points(starsGeo, starsMat));

    // Floating particles — multi-level colors
    const pCount = 3000;
    const pPos = new Float32Array(pCount * 3);
    const pColors = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount; i++) {
      pPos[i * 3] = (Math.random() - 0.5) * 32;
      pPos[i * 3 + 1] = Math.random() * 22 - 2;
      pPos[i * 3 + 2] = (Math.random() - 0.5) * 32;
      const level = Math.floor(Math.random() * LEVELS.length);
      const c = new THREE.Color(LEVELS[level].color);
      pColors[i * 3] = c.r; pColors[i * 3 + 1] = c.g; pColors[i * 3 + 2] = c.b;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
    pGeo.setAttribute("color", new THREE.BufferAttribute(pColors, 3));
    const pMat = new THREE.PointsMaterial({ size: 0.035, vertexColors: true, transparent: true, opacity: 0.65 });
    const particles = new THREE.Points(pGeo, pMat);
    scene.add(particles);
    particlesRef.current = particles;

    // Ground grid
    const gridHelper = new THREE.GridHelper(50, 60, 0x001a0a, 0x000d05);
    gridHelper.position.y = -2.5;
    scene.add(gridHelper);

    // Ground glow disc
    const discGeo = new THREE.CircleGeometry(8, 64);
    const discMat = new THREE.MeshBasicMaterial({ color: 0x00ff41, transparent: true, opacity: 0.03, side: THREE.DoubleSide });
    const disc = new THREE.Mesh(discGeo, discMat);
    disc.rotation.x = -Math.PI / 2;
    disc.position.y = -2.49;
    scene.add(disc);

    // Pyramid levels — 9 levels
    platformRefs.current = [];
    const LEVEL_COUNT = LEVELS.length;
    LEVELS.forEach((lv, i) => {
      const yPos = i * 2.0 - 1;
      const scale = 1 - i * 0.09;
      const width = 7.0 * scale;
      const depth = 4.5 * scale;

      const platformGeo = new THREE.BoxGeometry(width, 0.22, depth, 4, 1, 4);
      const platformMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(lv.color),
        emissive: new THREE.Color(lv.emissive),
        emissiveIntensity: 0.5,
        metalness: 0.85, roughness: 0.15,
        transparent: true, opacity: 0.88,
      });
      const platform = new THREE.Mesh(platformGeo, platformMat);
      platform.position.set(0, yPos, 0);
      platform.castShadow = true;
      platform.receiveShadow = true;
      platform.userData = { levelId: i };
      group.add(platform);
      platformRefs.current.push(platform);

      const edgeGeo = new THREE.EdgesGeometry(platformGeo);
      const edgeMat = new THREE.LineBasicMaterial({ color: new THREE.Color(lv.color), transparent: true, opacity: 0.95 });
      const edges = new THREE.LineSegments(edgeGeo, edgeMat);
      platform.add(edges);

      const pLight = new THREE.PointLight(new THREE.Color(lv.color), 0.7, 4.5);
      pLight.position.set(0, yPos + 0.5, 0);
      scene.add(pLight);

      // Rotating ring
      const ringGeo = new THREE.TorusGeometry(width * 0.68, 0.035, 8, 64);
      const ringMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(lv.color), transparent: true, opacity: 0.55 });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(0, yPos + 0.13, 0);
      ring.userData = { ringSpeed: (i + 1) * 0.007 * (i % 2 === 0 ? 1 : -1) };
      group.add(ring);

      if (i >= 3) {
        const ring2Geo = new THREE.TorusGeometry(width * 0.52, 0.018, 6, 48);
        const ring2Mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(lv.color), transparent: true, opacity: 0.3 });
        const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
        ring2.rotation.set(Math.PI / 3, 0, Math.PI / 6);
        ring2.position.set(0, yPos + 0.13, 0);
        ring2.userData = { ringSpeed: -(i + 1) * 0.011 };
        group.add(ring2);
      }

      // Danger orb at higher levels
      if (i >= 5) {
        const orbGeo = new THREE.SphereGeometry(0.28, 32, 32);
        const orbMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(lv.color), emissive: new THREE.Color(lv.color),
          emissiveIntensity: 1.5, metalness: 0.1, roughness: 0.05, transparent: true, opacity: 0.92,
        });
        const orb = new THREE.Mesh(orbGeo, orbMat);
        orb.position.set(0, yPos + 0.55, 0);
        orb.userData = { pulseBase: yPos + 0.55, pulseOffset: Math.random() * Math.PI * 2 };
        group.add(orb);
      }

      // Vertical connectors
      if (i < LEVEL_COUNT - 1) {
        const connGeo = new THREE.CylinderGeometry(0.012, 0.012, 2.0, 6);
        const connMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(lv.color), transparent: true, opacity: 0.35 });
        [-width * 0.38, 0, width * 0.38].forEach(xOff => {
          const conn = new THREE.Mesh(connGeo, connMat);
          conn.position.set(xOff, yPos + 1.0 + 0.11, 0);
          group.add(conn);
        });
      }
    });

    // Top crown — golden octahedron for Level 9
    const crownGeo = new THREE.OctahedronGeometry(0.65, 2);
    const crownMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24, emissive: 0xfbbf24, emissiveIntensity: 2.2,
      metalness: 0.3, roughness: 0.04, transparent: true, opacity: 0.95,
    });
    const crown = new THREE.Mesh(crownGeo, crownMat);
    const topY = (LEVELS.length - 1) * 2.0 - 1 + 1.1;
    crown.position.set(0, topY, 0);
    crown.userData = { isCrown: true, pulseOffset: 0 };
    group.add(crown);
    const crownWire = new THREE.Mesh(crownGeo, new THREE.MeshBasicMaterial({ color: 0xfbbf24, wireframe: true, transparent: true, opacity: 0.45 }));
    crownWire.position.copy(crown.position);
    group.add(crownWire);

    const crownLight = new THREE.PointLight(0xfbbf24, 4, 14);
    crownLight.position.copy(crown.position);
    scene.add(crownLight);

    // Extra top crown light (blue — quantum)
    const quantumLight = new THREE.PointLight(0xa78bfa, 2, 10);
    quantumLight.position.set(2, topY - 3, 2);
    scene.add(quantumLight);

    // Weapon orbs (orbit further out)
    weaponGroupsRef.current = [];
    WEAPONS.forEach((w, wi) => {
      const angle = (wi / WEAPONS.length) * Math.PI * 2;
      const radius = 9;
      const wGroup = new THREE.Group();
      wGroup.position.set(Math.cos(angle) * radius, 3 + wi * 1.5, Math.sin(angle) * radius);
      wGroup.userData = { orbitAngle: angle, orbitRadius: radius, orbitSpeed: 0.0025 + wi * 0.0008, weaponId: w.id };
      scene.add(wGroup);
      weaponGroupsRef.current.push(wGroup);

      const sphereGeo = new THREE.SphereGeometry(0.42, 24, 24);
      const sphereMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(w.color), emissive: new THREE.Color(w.color),
        emissiveIntensity: 0.9, metalness: 0.6, roughness: 0.18, transparent: true, opacity: 0.9,
      });
      wGroup.add(new THREE.Mesh(sphereGeo, sphereMat));

      const wRingGeo = new THREE.TorusGeometry(0.65, 0.012, 6, 32);
      const wRingMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(w.color), transparent: true, opacity: 0.5 });
      const wRing = new THREE.Mesh(wRingGeo, wRingMat);
      wRing.rotation.x = Math.PI / 2;
      wGroup.add(wRing);

      const wLight = new THREE.PointLight(new THREE.Color(w.color), 0.7, 5);
      wGroup.add(wLight);
    });

    // Energy beams
    WEAPONS.forEach((w, wi) => {
      const angle = (wi / WEAPONS.length) * Math.PI * 2;
      const from = new THREE.Vector3(Math.cos(angle) * 9, 3 + wi * 1.5, Math.sin(angle) * 9);
      const to = new THREE.Vector3(0, 5, 0);
      const beamGeo = new THREE.BufferGeometry().setFromPoints([from, to]);
      const beamMat = new THREE.LineBasicMaterial({ color: new THREE.Color(w.color), transparent: true, opacity: 0.12 });
      scene.add(new THREE.Line(beamGeo, beamMat));
    });

    // Raycaster
    const raycaster = new THREE.Raycaster();
    const onClickFn = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObjects(platformRefs.current, false);
      if (hits.length > 0) {
        const lvId = hits[0].object.userData.levelId;
        setSelectedLevel(prev => prev === lvId ? null : lvId);
        setTab("pyramid");
      }
    };
    canvas.addEventListener("click", onClickFn);

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      mouseRef.current.y = -((e.clientY - rect.top) / rect.height - 0.5) * 2;
    };
    canvas.addEventListener("mousemove", onMouseMove);

    let frameId = 0;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const t = clockRef.current.getElapsedTime();

      const targetX = mouseRef.current.x * 2.5;
      const targetY = mouseRef.current.y * 1.2 + 4;
      camera.position.x += (Math.sin(t * 0.1) * 4 + targetX - camera.position.x) * 0.022;
      camera.position.y += (targetY - camera.position.y) * 0.018;
      camera.lookAt(0, 4, 0);

      group.children.forEach(child => {
        if (child.userData.ringSpeed !== undefined) {
          child.rotation.z += child.userData.ringSpeed;
        }
      });

      group.children.forEach(child => {
        if (child.userData.isCrown) {
          child.rotation.y += 0.016;
          child.rotation.x += 0.007;
          const s = 1 + Math.sin(t * 2.5) * 0.14;
          child.scale.set(s, s, s);
        }
        if (child.userData.pulseBase !== undefined && !child.userData.isCrown) {
          child.position.y = child.userData.pulseBase + Math.sin(t * 2.2 + (child.userData.pulseOffset || 0)) * 0.15;
        }
      });

      weaponGroupsRef.current.forEach(wg => {
        wg.userData.orbitAngle += wg.userData.orbitSpeed;
        const r = wg.userData.orbitRadius;
        wg.position.x = Math.cos(wg.userData.orbitAngle) * r;
        wg.position.z = Math.sin(wg.userData.orbitAngle) * r;
        wg.rotation.y += 0.018;
      });

      if (particlesRef.current) {
        particlesRef.current.rotation.y += 0.0005;
        const pPos = particlesRef.current.geometry.attributes.position as THREE.BufferAttribute;
        const arr = pPos.array as Float32Array;
        for (let i = 1; i < arr.length; i += 3) {
          arr[i] += 0.0018;
          if (arr[i] > 20) arr[i] = -2;
        }
        pPos.needsUpdate = true;
      }

      platformRefs.current.forEach((p, i) => {
        const mat = p.material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = selectedLevel === i
          ? 1.1 + Math.sin(t * 4) * 0.25
          : 0.5;
      });

      renderer.render(scene, camera);
    };
    animate();
    rafRef.current = frameId;

    const onResize = () => {
      const W2 = canvas.clientWidth, H2 = canvas.clientHeight;
      camera.aspect = W2 / H2;
      camera.updateProjectionMatrix();
      renderer.setSize(W2, H2, false);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(frameId);
      canvas.removeEventListener("click", onClickFn);
      canvas.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
    };
  }, [selectedLevel]);

  useEffect(() => {
    if (!open) return;
    clockRef.current = new THREE.Clock();
    let cleanup: (() => void) | undefined;
    const timeout = setTimeout(() => { cleanup = initScene() ?? undefined; }, 80);
    return () => {
      clearTimeout(timeout);
      cancelAnimationFrame(rafRef.current);
      rendererRef.current?.dispose();
      cleanup?.();
    };
  }, [open, initScene]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onOpenChange(false); };
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  const lv = selectedLevel !== null ? LEVELS[selectedLevel] : null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[9999] flex flex-col"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
        >
          {/* Canvas always present for pyramid tab */}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full"
            style={{ display: tab === "supreme" ? "none" : "block" }}
          />

          {/* SUPREME tab — full screen 2.5D animated layout */}
          {tab === "supreme" && (
            <div className="absolute inset-0 overflow-y-auto" style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(251,191,36,0.06) 0%, rgba(1,2,6,1) 55%)" }}>
              {/* Animated grid background */}
              <div className="absolute inset-0 pointer-events-none" style={{
                backgroundImage: "linear-gradient(rgba(251,191,36,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(251,191,36,0.04) 1px, transparent 1px)",
                backgroundSize: "60px 60px",
              }} />
              <div className="relative z-10 pt-16 pb-8 px-4 max-w-4xl mx-auto">
                {/* Supreme header */}
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
                  <div className="inline-flex items-center gap-3 px-6 py-2.5 rounded-full mb-4"
                    style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.3)", boxShadow: "0 0 40px rgba(251,191,36,0.15)" }}>
                    <motion.div animate={{ rotate: [0, 360] }} transition={{ duration: 6, repeat: Infinity, ease: "linear" }}>
                      <Atom className="w-4 h-4" style={{ color: "#fbbf24" }} />
                    </motion.div>
                    <span className="font-mono text-xs font-black tracking-widest" style={{ color: "#fbbf24" }}>SUPREME ARSENAL — القوة المطلقة</span>
                  </div>
                  <h2 className="text-2xl font-black text-white mb-2">ما وراء الهرم</h2>
                  <p className="text-sm font-mono" style={{ color: "rgba(255,255,255,0.35)" }}>أسلحة الجيل القادم التي تتجاوز مفهوم الاختراق التقليدي</p>
                </motion.div>

                {/* Final pyramid summary */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
                  className="mb-8 rounded-[18px] overflow-hidden"
                  style={{ background: "rgba(0,0,0,0.6)", border: "1px solid rgba(251,191,36,0.2)" }}>
                  <div className="px-5 py-3 border-b" style={{ borderColor: "rgba(251,191,36,0.15)", background: "rgba(251,191,36,0.04)" }}>
                    <span className="font-mono text-xs font-black tracking-widest" style={{ color: "#fbbf24" }}>هرم القوة المطلقة — الترتيب النهائي</span>
                  </div>
                  <div className="p-4">
                    <div className="space-y-1">
                      {[
                        { label: "الذكاء الاصطناعي الهجومي + حواسب كمومية", sub: "القوة المطلقة", color: "#fbbf24", pct: 100 },
                        { label: "أسلحة الدول والسيادة (Pegasus, Stuxnet, Zero-Clicks)", sub: "اختراق صامت وتدمير فيزيائي", color: "#00e5ff", pct: 85 },
                        { label: "أنظمة التحكم العسكرية — Cobalt Strike وما فوق", sub: "السيطرة الكاملة على الدول", color: "#ec4899", pct: 72 },
                        { label: "Custom LFS + Proprietary OS", sub: "التخفي المطلق + Zero-Click", color: "#e21227", pct: 60 },
                        { label: "DragonOS / SDR — اختراق الفيزيائي", sub: "راديو وأقمار وطائرات", color: "#f97316", pct: 42 },
                        { label: "BlackArch — ترسانة شاملة", sub: "2800+ أداة هجوم", color: "#3b82f6", pct: 28 },
                        { label: "Kali Linux — مستوى البداية", sub: "600+ أداة مجانية", color: "#00ff41", pct: 15 },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center gap-3 py-1.5">
                          <div className="text-[10px] font-mono font-bold w-4 text-right" style={{ color: item.color }}>#{i + 1}</div>
                          <div className="flex-1 h-6 rounded-lg overflow-hidden relative" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${item.color}18` }}>
                            <motion.div className="h-full rounded-lg flex items-center px-2"
                              initial={{ width: 0 }} animate={{ width: `${item.pct}%` }}
                              transition={{ delay: i * 0.08 + 0.3, duration: 0.8, ease: "easeOut" }}
                              style={{ background: `linear-gradient(90deg, ${item.color}22 0%, ${item.color}18 100%)` }}>
                              <span className="text-[9px] font-mono font-bold whitespace-nowrap truncate" style={{ color: item.color }}>{item.label}</span>
                            </motion.div>
                          </div>
                          <div className="text-[9px] font-mono" style={{ color: item.color }}>{item.pct}%</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>

                {/* Supreme tiers grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {SUPREME_TIERS.map((tier, idx) => (
                    <motion.div
                      key={tier.tier}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.06 + 0.3 }}
                      onClick={() => setSupremeTier(prev => prev === tier.tier ? null : tier.tier)}
                      className="cursor-pointer rounded-[18px] overflow-hidden transition-all"
                      style={{
                        background: supremeTier === tier.tier
                          ? `radial-gradient(circle at 20% 20%, ${tier.color}18 0%, rgba(0,0,0,0.8) 70%)`
                          : "rgba(0,0,0,0.5)",
                        border: `1px solid ${supremeTier === tier.tier ? tier.color + "55" : "rgba(255,255,255,0.06)"}`,
                        boxShadow: supremeTier === tier.tier ? `0 0 30px ${tier.color}20` : "none",
                      }}
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="absolute top-0 inset-x-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${tier.color}60, transparent)` }} />
                      <div className="p-4">
                        <div className="flex items-start gap-3 mb-3">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center font-mono text-xs font-black flex-shrink-0"
                            style={{ background: `${tier.color}15`, border: `1px solid ${tier.color}35`, color: tier.color }}>
                            {tier.tier}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-sm text-white mb-0.5">{tier.name}</div>
                            <div className="font-mono text-[10px]" style={{ color: tier.color }}>{tier.en}</div>
                          </div>
                          <motion.div animate={{ rotate: supremeTier === tier.tier ? 90 : 0 }} transition={{ duration: 0.2 }}>
                            <ChevronRight className="w-4 h-4" style={{ color: tier.color + "80" }} />
                          </motion.div>
                        </div>
                        <AnimatePresence>
                          {supremeTier === tier.tier && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden">
                              <div className="space-y-2 pt-2 border-t" style={{ borderColor: tier.color + "22" }}>
                                {tier.items.map((item, ii) => (
                                  <div key={ii} className="flex items-start gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: tier.color, boxShadow: `0 0 4px ${tier.color}` }} />
                                    <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.75)" }}>{item}</p>
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Bottom signature */}
                <div className="mt-8 text-center">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl"
                    style={{ background: "rgba(226,18,39,0.06)", border: "1px solid rgba(226,18,39,0.2)" }}>
                    <Activity className="w-3.5 h-3.5" style={{ color: "#e21227" }} />
                    <span className="font-mono text-[10px] font-black tracking-widest" style={{ color: "#e21227" }}>
                      "نحن لا نخترق الأنظمة.. نحن نملك الواقع الرقمي بالكامل." — KaliGPT // OMNI-MATRIX
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="relative z-10 flex items-center justify-between px-4 pt-3 pb-[10px] border-b"
            style={{
              borderColor: "rgba(0,255,65,0.15)",
              background: tab === "supreme"
                ? "rgba(2,2,8,0.96)"
                : "rgba(0,0,0,0.62)",
              backdropFilter: "blur(16px)",
            }}>
            <div className="flex items-center gap-3">
              <motion.div animate={{ scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }} transition={{ duration: 2, repeat: Infinity }}>
                <div className="w-2 h-2 rounded-full" style={{ background: "#00ff41", boxShadow: "0 0 8px #00ff41" }} />
              </motion.div>
              <span className="font-mono text-sm font-bold tracking-widest" style={{ color: "#00ff41" }}>CYBER HIERARCHY MATRIX</span>
              <span className="font-mono text-xs hidden sm:block" style={{ color: "rgba(0,255,65,0.4)" }}>// هرم الخطر السيبراني — الإصدار الشامل</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex gap-1 rounded-lg p-1" style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <button onClick={() => setTab("pyramid")}
                  className="px-2 sm:px-3 py-1 rounded text-xs font-mono transition-all"
                  style={{ background: tab === "pyramid" ? "rgba(0,255,65,0.18)" : "transparent", color: tab === "pyramid" ? "#00ff41" : "rgba(0,255,65,0.35)" }}>
                  PYRAMID
                </button>
                <button onClick={() => setTab("weapons")}
                  className="px-2 sm:px-3 py-1 rounded text-xs font-mono transition-all"
                  style={{ background: tab === "weapons" ? "rgba(226,18,39,0.18)" : "transparent", color: tab === "weapons" ? "#e21227" : "rgba(226,18,39,0.35)" }}>
                  WEAPONS
                </button>
                <button onClick={() => setTab("supreme")}
                  className="px-2 sm:px-3 py-1 rounded text-xs font-mono transition-all flex items-center gap-1"
                  style={{ background: tab === "supreme" ? "rgba(251,191,36,0.18)" : "transparent", color: tab === "supreme" ? "#fbbf24" : "rgba(251,191,36,0.35)" }}>
                  <Atom className="w-3 h-3" />
                  <span className="hidden sm:inline">SUPREME</span>
                </button>
              </div>
              <button onClick={() => onOpenChange(false)}
                className="p-1.5 rounded-lg border transition-all"
                style={{ border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)" }}
                onMouseEnter={e => { e.currentTarget.style.color = "#00ff41"; e.currentTarget.style.borderColor = "rgba(0,255,65,0.4)"; }}
                onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.4)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}>
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Left — level list (pyramid + weapons tabs) */}
          {tab !== "supreme" && (
            <div className="absolute left-2 sm:left-4 top-16 bottom-4 z-10 flex flex-col gap-1 sm:gap-1.5 w-40 sm:w-52">
              <div className="text-[9px] font-mono tracking-widest mb-1 px-1" style={{ color: "rgba(0,255,65,0.4)" }}>// مستويات الخطر</div>
              {LEVELS.map((lv2, i) => {
                const Icon = lv2.icon;
                return (
                  <motion.button
                    key={lv2.id}
                    onClick={() => { setSelectedLevel(prev => prev === i ? null : i); setTab("pyramid"); }}
                    className="flex items-center gap-2 px-2 sm:px-3 py-1.5 rounded-lg border transition-all text-left"
                    style={{
                      borderColor: selectedLevel === i ? lv2.color + "66" : "#1f1f1f",
                      background: selectedLevel === i ? lv2.color + "15" : "rgba(0,0,0,0.5)",
                      backdropFilter: "blur(8px)",
                    }}
                    whileHover={{ x: 3 }} whileTap={{ scale: 0.97 }}
                  >
                    <Icon className="w-3 h-3 flex-shrink-0" style={{ color: lv2.color }} />
                    <div className="min-w-0">
                      <div className="font-mono text-[10px] sm:text-xs font-bold truncate" style={{ color: lv2.color }}>
                        L{lv2.rank} — {lv2.name.split(" ")[0]}
                      </div>
                      <div className="text-[8px] sm:text-[10px] hidden sm:block truncate" style={{ color: "rgba(255,255,255,0.35)" }}>{lv2.sub.slice(0, 22)}</div>
                    </div>
                    {selectedLevel === i && <ChevronRight className="w-3 h-3 ml-auto flex-shrink-0" style={{ color: lv2.color }} />}
                  </motion.button>
                );
              })}

              {/* Danger index */}
              <div className="mt-2 px-2 sm:px-3 py-2 rounded-lg border" style={{ borderColor: "#1f1f1f", background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)" }}>
                <div className="text-[9px] font-mono mb-1.5" style={{ color: "rgba(255,255,255,0.3)" }}>THREAT RATING</div>
                {LEVELS.map(lv2 => (
                  <div key={lv2.id} className="flex items-center gap-1.5 mb-1">
                    <div className="text-[9px] font-mono w-6" style={{ color: lv2.color }}>L{lv2.rank}</div>
                    <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "#111" }}>
                      <motion.div className="h-full rounded-full" style={{ background: lv2.color }}
                        initial={{ width: 0 }} animate={{ width: `${lv2.dangerPct}%` }}
                        transition={{ delay: lv2.id * 0.08 + 0.3, duration: 0.7, ease: "easeOut" }} />
                    </div>
                    <div className="text-[8px] font-mono" style={{ color: lv2.color }}>{lv2.dangerPct}%</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Right — weapons panel */}
          <AnimatePresence>
            {tab === "weapons" && (
              <motion.div
                className="absolute right-2 sm:right-4 top-16 bottom-4 z-10 w-56 sm:w-72 flex flex-col gap-2 overflow-y-auto"
                style={{ scrollbarWidth: "none" }}
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
              >
                <div className="text-[10px] font-mono tracking-widest mb-1 px-1" style={{ color: "rgba(226,18,39,0.6)" }}>// الأسلحة السيبرانية الفتّاكة</div>
                {WEAPONS.map(w => (
                  <motion.button key={w.id}
                    onClick={() => setSelectedWeapon(prev => prev === w.id ? null : w.id)}
                    className="text-left px-3 py-2.5 rounded-lg border transition-all"
                    style={{
                      borderColor: selectedWeapon === w.id ? w.color + "55" : "#1f1f1f",
                      background: selectedWeapon === w.id ? w.color + "12" : "rgba(0,0,0,0.55)",
                      backdropFilter: "blur(8px)",
                    }}
                    whileHover={{ x: -3 }} whileTap={{ scale: 0.97 }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-xs font-bold" style={{ color: w.color }}>{w.name}</span>
                      <AlertTriangle className="w-3 h-3" style={{ color: w.color }} />
                    </div>
                    <div className="text-[10px] mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>{w.sub}</div>
                    <AnimatePresence>
                      {selectedWeapon === w.id && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                          className="text-[11px] leading-relaxed border-t pt-2 mt-1"
                          style={{ borderColor: w.color + "33", color: "rgba(255,255,255,0.7)" }}>
                          {w.desc}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.button>
                ))}
                <div className="mt-2 px-3 py-3 rounded-lg border" style={{ border: "1px solid rgba(226,18,39,0.2)", background: "rgba(226,18,39,0.04)", backdropFilter: "blur(8px)" }}>
                  <div className="font-mono text-[10px] leading-relaxed" style={{ color: "rgba(226,18,39,0.8)" }}>
                    "نحن لا نخترق الأنظمة.. نحن نملك الواقع الرقمي بالكامل."
                  </div>
                  <div className="font-mono text-[10px] mt-1" style={{ color: "rgba(226,18,39,0.4)" }}>— KaliGPT // OMNI-MATRIX</div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Right — concepts ticker (pyramid tab) */}
          {tab === "pyramid" && (
            <div className="absolute top-16 right-2 sm:right-4 z-10 w-48 sm:w-64">
              <div className="px-3 py-2.5 rounded-lg border" style={{ border: "1px solid #1f1f1f", background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)" }}>
                <div className="text-[10px] font-mono tracking-widest mb-2" style={{ color: "rgba(0,229,255,0.5)" }}>// مفاهيم الحرب السيبرانية</div>
                {[
                  { label: "Zero-Click Exploit", color: "#00e5ff", desc: "اختراق بدون أي تفاعل" },
                  { label: "Agentic AI Hacking", color: "#ff6b35", desc: "ذكاء اصطناعي هجومي مستقل" },
                  { label: "Quantum Decryption", color: "#a78bfa", desc: "كسر التشفير في ثوانٍ" },
                  { label: "SCADA Kinetic Strike", color: "#e21227", desc: "تدمير بنية تحتية فيزيائي" },
                  { label: "BGP/DNS Hijack", color: "#f97316", desc: "إعادة توجيه الإنترنت" },
                  { label: "Orbital Malware", color: "#fbbf24", desc: "حروب الفضاء السيبراني" },
                ].map((c, ci) => (
                  <div key={ci} className="flex items-start gap-2 mb-1.5">
                    <div className="w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0" style={{ background: c.color }} />
                    <div>
                      <div className="font-mono text-[10px] font-bold" style={{ color: c.color }}>{c.label}</div>
                      <div className="text-[9px]" style={{ color: "rgba(255,255,255,0.35)" }}>{c.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bottom — selected level detail */}
          <AnimatePresence>
            {lv && tab === "pyramid" && (
              <motion.div
                key={lv.id}
                className="absolute bottom-4 left-[168px] sm:left-[220px] right-2 sm:right-4 z-10 rounded-xl border p-3 sm:p-4"
                style={{ borderColor: lv.color + "44", background: "rgba(1,2,6,0.9)", backdropFilter: "blur(20px)" }}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
                transition={{ type: "spring", stiffness: 320, damping: 28 }}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center border"
                    style={{ borderColor: lv.color + "44", background: lv.color + "15" }}>
                    <lv.icon className="w-4 h-4" style={{ color: lv.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-mono text-xs sm:text-sm font-bold" style={{ color: lv.color }}>{lv.label}</span>
                      <span className="font-mono text-xs sm:text-sm font-bold text-white">{lv.name}</span>
                      <div className="ml-auto flex items-center gap-1.5">
                        <div className="h-1.5 w-16 sm:w-20 rounded-full overflow-hidden" style={{ background: "#111" }}>
                          <div className="h-full rounded-full" style={{ width: `${lv.dangerPct}%`, background: lv.color }} />
                        </div>
                        <span className="font-mono text-xs" style={{ color: lv.color }}>{lv.dangerPct}%</span>
                      </div>
                    </div>
                    <p className="text-xs sm:text-sm leading-relaxed mb-2" style={{ color: "rgba(255,255,255,0.75)" }}>{lv.desc}</p>
                    <div className="flex flex-wrap gap-1.5">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded" style={{ background: lv.color + "18", color: lv.color, border: `1px solid ${lv.color}33` }}>
                        {lv.threat}
                      </span>
                      {lv.tags.map(tag => (
                        <span key={tag} className="text-[10px] font-mono px-2 py-0.5 rounded border" style={{ borderColor: "#1f1f1f", color: "rgba(255,255,255,0.45)" }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button onClick={() => setSelectedLevel(null)}
                    className="p-1 rounded flex-shrink-0"
                    style={{ color: "rgba(255,255,255,0.3)" }}
                    onMouseEnter={e => { e.currentTarget.style.color = "rgba(255,255,255,0.7)"; }}
                    onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.3)"; }}>
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Scan line overlay */}
          <div className="absolute inset-0 pointer-events-none z-[5]"
            style={{ background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,65,0.008) 2px, rgba(0,255,65,0.008) 4px)" }} />

          {/* Corner accents */}
          <div className="absolute top-16 left-[168px] sm:left-[220px] w-6 h-6 border-t-2 border-l-2 z-10 mt-1 ml-1" style={{ borderColor: "rgba(0,255,65,0.3)" }} />
          <div className="absolute bottom-4 right-2 sm:right-4 w-6 h-6 border-b-2 border-r-2 z-10" style={{ borderColor: "rgba(0,255,65,0.3)" }} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
