import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, AlertTriangle, Shield, Zap, Radio, Terminal, Lock, Cpu, Satellite } from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════════
   CYBER HIERARCHY 3D MODAL
   هرم الخطر السيبراني — تجسيد ثلاثي الأبعاد لمستويات القوة الهجومية
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
    dangerPct: 20,
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
    dangerPct: 40,
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
    dangerPct: 62,
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
    dangerPct: 80,
    desc: "أخطر الهاكرز يبنون نظامهم من الصفر (Linux From Scratch). لا توجد بصمة رقمية في أي قاعدة بيانات أمنية. أدوات مخصصة بـ C++ أو Python مجهولة الهوية تماماً.",
    tags: ["Zero Signature", "LFS Build", "Custom Tools", "Invisible"],
    threat: "تخفي مطلق • لا يمكن اكتشافه",
  },
  {
    id: 4, rank: 5,
    name: "Proprietary Exploit OS",
    label: "المستوى الخامس — القمة المطلقة",
    sub: "Zero-Click • أسلحة الدول",
    color: "#00e5ff", emissive: "#0284c7",
    glow: "rgba(0,229,255,",
    icon: Satellite,
    dangerPct: 100,
    desc: "Pegasus و EternalBlue وما أعلى — أنظمة تُباع بملايين الدولارات للحكومات فقط. تخترق أحدث iPhone بمجرد رسالة صامتة لا يراها المستخدم. Zero-Click Exploits.",
    tags: ["Pegasus", "EternalBlue", "Zero-Click", "NSO Group"],
    threat: "اختراق هواتف صامت • حكومي",
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
    id: "ghostproto", name: "GHOST PROTOCOL",
    sub: "Custom C2 + Rootkits",
    color: "#8b5cf6",
    desc: "شبكة خوادم C2 موزعة في دول خارج القانون الدولي. Rootkits تنام في Kernel لسنوات دون اكتشاف.",
  },
];

export function CyberHierarchy3DModal({ open, onOpenChange }: CyberHierarchy3DModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const rafRef = useRef<number>(0);
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [selectedWeapon, setSelectedWeapon] = useState<string | null>(null);
  const [tab, setTab] = useState<"pyramid" | "weapons">("pyramid");
  const mouseRef = useRef({ x: 0, y: 0 });
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const groupRef = useRef<THREE.Group | null>(null);
  const platformRefs = useRef<THREE.Mesh[]>([]);
  const particlesRef = useRef<THREE.Points | null>(null);
  const weaponGroupsRef = useRef<THREE.Group[]>([]);
  const clockRef = useRef(new THREE.Clock());

  const initScene = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const W = canvas.clientWidth, H = canvas.clientHeight;
    const dpr = Math.min(window.devicePixelRatio * 2, 4);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
    renderer.setPixelRatio(dpr);
    renderer.setSize(W, H, false);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.4;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020408);
    scene.fog = new THREE.FogExp2(0x020408, 0.04);

    const camera = new THREE.PerspectiveCamera(55, W / H, 0.1, 200);
    camera.position.set(0, 2, 14);
    camera.lookAt(0, 1, 0);
    cameraRef.current = camera;

    // ── Ambient + Hemisphere ──────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0x001122, 0.6));
    const hemi = new THREE.HemisphereLight(0x001133, 0x000000, 0.4);
    scene.add(hemi);

    // ── Main group ───────────────────────────────────────────────────
    const group = new THREE.Group();
    scene.add(group);
    groupRef.current = group;

    // ── Stars ────────────────────────────────────────────────────────
    const starsGeo = new THREE.BufferGeometry();
    const starsCount = 8000;
    const starsPos = new Float32Array(starsCount * 3);
    const starsColor = new Float32Array(starsCount * 3);
    for (let i = 0; i < starsCount; i++) {
      const r = 80 + Math.random() * 60;
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
    const starsMat = new THREE.PointsMaterial({ size: 0.08, vertexColors: true, transparent: true, opacity: 0.9 });
    scene.add(new THREE.Points(starsGeo, starsMat));

    // ── Floating particles ───────────────────────────────────────────
    const pCount = 2000;
    const pPos = new Float32Array(pCount * 3);
    const pColors = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount; i++) {
      pPos[i * 3] = (Math.random() - 0.5) * 24;
      pPos[i * 3 + 1] = Math.random() * 14 - 2;
      pPos[i * 3 + 2] = (Math.random() - 0.5) * 24;
      const level = Math.floor(Math.random() * 5);
      const c = new THREE.Color(LEVELS[level].color);
      pColors[i * 3] = c.r; pColors[i * 3 + 1] = c.g; pColors[i * 3 + 2] = c.b;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
    pGeo.setAttribute("color", new THREE.BufferAttribute(pColors, 3));
    const pMat = new THREE.PointsMaterial({ size: 0.04, vertexColors: true, transparent: true, opacity: 0.7 });
    const particles = new THREE.Points(pGeo, pMat);
    scene.add(particles);
    particlesRef.current = particles;

    // ── Ground grid ──────────────────────────────────────────────────
    const gridHelper = new THREE.GridHelper(30, 40, 0x003311, 0x001a08);
    gridHelper.position.y = -2;
    scene.add(gridHelper);

    // ── Ground glow disc ─────────────────────────────────────────────
    const discGeo = new THREE.CircleGeometry(6, 64);
    const discMat = new THREE.MeshBasicMaterial({
      color: 0x00ff41, transparent: true, opacity: 0.04, side: THREE.DoubleSide,
    });
    const disc = new THREE.Mesh(discGeo, discMat);
    disc.rotation.x = -Math.PI / 2;
    disc.position.y = -1.99;
    scene.add(disc);

    // ── Pyramid levels ───────────────────────────────────────────────
    platformRefs.current = [];
    const LEVEL_COUNT = LEVELS.length;
    LEVELS.forEach((lv, i) => {
      const yPos = i * 2.2 - 1;
      const scale = 1 - i * 0.14;
      const width = 5.5 * scale;
      const depth = 3.5 * scale;

      // Platform
      const platformGeo = new THREE.BoxGeometry(width, 0.25, depth, 4, 1, 4);
      const platformMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(lv.color),
        emissive: new THREE.Color(lv.emissive),
        emissiveIntensity: 0.4,
        metalness: 0.8, roughness: 0.2,
        transparent: true, opacity: 0.85,
      });
      const platform = new THREE.Mesh(platformGeo, platformMat);
      platform.position.set(0, yPos, 0);
      platform.castShadow = true;
      platform.receiveShadow = true;
      platform.userData = { levelId: i };
      group.add(platform);
      platformRefs.current.push(platform);

      // Edge wireframe
      const edgeGeo = new THREE.EdgesGeometry(platformGeo);
      const edgeMat = new THREE.LineBasicMaterial({ color: new THREE.Color(lv.color), transparent: true, opacity: 0.9 });
      const edges = new THREE.LineSegments(edgeGeo, edgeMat);
      platform.add(edges);

      // Point light per level
      const pLight = new THREE.PointLight(new THREE.Color(lv.color), 0.8, 5);
      pLight.position.set(0, yPos + 0.5, 0);
      scene.add(pLight);

      // Rotating ring
      const ringGeo = new THREE.TorusGeometry(width * 0.72, 0.04, 8, 64);
      const ringMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(lv.color), transparent: true, opacity: 0.6 });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(0, yPos + 0.15, 0);
      ring.userData = { ringSpeed: (i + 1) * 0.008 * (i % 2 === 0 ? 1 : -1) };
      group.add(ring);

      // Secondary ring (tilted)
      if (i >= 2) {
        const ring2Geo = new THREE.TorusGeometry(width * 0.55, 0.02, 6, 48);
        const ring2Mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(lv.color), transparent: true, opacity: 0.35 });
        const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
        ring2.rotation.set(Math.PI / 3, 0, Math.PI / 6);
        ring2.position.set(0, yPos + 0.15, 0);
        ring2.userData = { ringSpeed: -(i + 1) * 0.012 };
        group.add(ring2);
      }

      // Danger orb at top levels
      if (i >= 3) {
        const orbGeo = new THREE.SphereGeometry(0.22, 32, 32);
        const orbMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(lv.color), emissive: new THREE.Color(lv.color),
          emissiveIntensity: 1.2, metalness: 0.1, roughness: 0.1, transparent: true, opacity: 0.9,
        });
        const orb = new THREE.Mesh(orbGeo, orbMat);
        orb.position.set(0, yPos + 0.5, 0);
        orb.userData = { pulseBase: yPos + 0.5, pulseOffset: Math.random() * Math.PI * 2 };
        group.add(orb);
      }

      // Vertical connectors between levels
      if (i < LEVEL_COUNT - 1) {
        const connGeo = new THREE.CylinderGeometry(0.015, 0.015, 2.2, 6);
        const connMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(lv.color), transparent: true, opacity: 0.4 });
        [-width * 0.4, 0, width * 0.4].forEach(xOff => {
          const conn = new THREE.Mesh(connGeo, connMat);
          conn.position.set(xOff, yPos + 1.1 + 0.125, 0);
          group.add(conn);
        });
      }
    });

    // ── Top crown for Level 5 ─────────────────────────────────────────
    const crownGeo = new THREE.OctahedronGeometry(0.5, 1);
    const crownMat = new THREE.MeshStandardMaterial({
      color: 0x00e5ff, emissive: 0x00e5ff, emissiveIntensity: 2.0,
      metalness: 0.2, roughness: 0.05, transparent: true, opacity: 0.95,
      wireframe: false,
    });
    const crown = new THREE.Mesh(crownGeo, crownMat);
    const topY = (LEVELS.length - 1) * 2.2 - 1 + 0.9;
    crown.position.set(0, topY, 0);
    crown.userData = { isCrown: true, pulseOffset: 0 };
    group.add(crown);
    const crownWire = new THREE.Mesh(crownGeo, new THREE.MeshBasicMaterial({ color: 0x00e5ff, wireframe: true, transparent: true, opacity: 0.5 }));
    crownWire.position.copy(crown.position);
    group.add(crownWire);

    // Crown point light
    const crownLight = new THREE.PointLight(0x00e5ff, 3, 10);
    crownLight.position.copy(crown.position);
    scene.add(crownLight);

    // ── Weapon orbs (floating around the pyramid) ─────────────────────
    weaponGroupsRef.current = [];
    WEAPONS.forEach((w, wi) => {
      const angle = (wi / WEAPONS.length) * Math.PI * 2;
      const radius = 7;
      const wGroup = new THREE.Group();
      wGroup.position.set(Math.cos(angle) * radius, 2 + wi * 1.2, Math.sin(angle) * radius);
      wGroup.userData = { orbitAngle: angle, orbitRadius: radius, orbitSpeed: 0.003 + wi * 0.001, weaponId: w.id };
      scene.add(wGroup);
      weaponGroupsRef.current.push(wGroup);

      const sphereGeo = new THREE.SphereGeometry(0.38, 24, 24);
      const sphereMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(w.color), emissive: new THREE.Color(w.color),
        emissiveIntensity: 0.8, metalness: 0.5, roughness: 0.2, transparent: true, opacity: 0.88,
      });
      wGroup.add(new THREE.Mesh(sphereGeo, sphereMat));

      // Orbit ring
      const wRingGeo = new THREE.TorusGeometry(0.55, 0.015, 6, 32);
      const wRingMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(w.color), transparent: true, opacity: 0.5 });
      const wRing = new THREE.Mesh(wRingGeo, wRingMat);
      wRing.rotation.x = Math.PI / 2;
      wGroup.add(wRing);

      // Point light
      const wLight = new THREE.PointLight(new THREE.Color(w.color), 0.6, 4);
      wGroup.add(wLight);
    });

    // ── Energy beams from weapons to pyramid ─────────────────────────
    WEAPONS.forEach((w, wi) => {
      const angle = (wi / WEAPONS.length) * Math.PI * 2;
      const from = new THREE.Vector3(Math.cos(angle) * 7, 2 + wi * 1.2, Math.sin(angle) * 7);
      const to = new THREE.Vector3(0, 4, 0);
      const beamGeo = new THREE.BufferGeometry().setFromPoints([from, to]);
      const beamMat = new THREE.LineBasicMaterial({ color: new THREE.Color(w.color), transparent: true, opacity: 0.15 });
      scene.add(new THREE.Line(beamGeo, beamMat));
    });

    // ── Raycaster for click detection ─────────────────────────────────
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

    // ── Animate ───────────────────────────────────────────────────────
    let frameId = 0;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const t = clockRef.current.getElapsedTime();

      // Camera gentle orbit
      const targetX = mouseRef.current.x * 2;
      const targetY = mouseRef.current.y * 1 + 2;
      camera.position.x += (Math.sin(t * 0.12) * 3 + targetX - camera.position.x) * 0.025;
      camera.position.y += (targetY - camera.position.y) * 0.02;
      camera.lookAt(0, 2, 0);

      // Rotate rings
      group.children.forEach(child => {
        if (child.userData.ringSpeed !== undefined) {
          child.rotation.z += child.userData.ringSpeed;
        }
      });

      // Crown pulse + spin
      group.children.forEach(child => {
        if (child.userData.isCrown) {
          child.rotation.y += 0.018;
          child.rotation.x += 0.008;
          const s = 1 + Math.sin(t * 3) * 0.12;
          child.scale.set(s, s, s);
        }
        if (child.userData.pulseBase !== undefined && !child.userData.isCrown) {
          child.position.y = child.userData.pulseBase + Math.sin(t * 2 + (child.userData.pulseOffset || 0)) * 0.12;
        }
      });

      // Weapon orbs orbit
      weaponGroupsRef.current.forEach(wg => {
        wg.userData.orbitAngle += wg.userData.orbitSpeed;
        const r = wg.userData.orbitRadius;
        wg.position.x = Math.cos(wg.userData.orbitAngle) * r;
        wg.position.z = Math.sin(wg.userData.orbitAngle) * r;
        wg.rotation.y += 0.02;
      });

      // Particle drift
      if (particlesRef.current) {
        particlesRef.current.rotation.y += 0.0006;
        const pPos = particlesRef.current.geometry.attributes.position as THREE.BufferAttribute;
        const arr = pPos.array as Float32Array;
        for (let i = 1; i < arr.length; i += 3) {
          arr[i] += 0.002;
          if (arr[i] > 12) arr[i] = -2;
        }
        pPos.needsUpdate = true;
      }

      // Highlight selected platform
      platformRefs.current.forEach((p, i) => {
        const mat = p.material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = selectedLevel === i
          ? 0.9 + Math.sin(t * 4) * 0.2
          : 0.4;
      });

      renderer.render(scene, camera);
    };
    animate();
    rafRef.current = frameId;

    // ── Resize ────────────────────────────────────────────────────────
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
  const wep = selectedWeapon ? WEAPONS.find(w => w.id === selectedWeapon) : null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[9999] flex flex-col"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
        >
          {/* Canvas */}
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

          {/* Header */}
          <div className="relative z-10 flex items-center justify-between px-5 py-3 border-b border-[#00ff41]/15 bg-black/60 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-[#00ff41] animate-pulse shadow-[0_0_8px_#00ff41]" />
              <span className="text-[#00ff41] font-mono text-sm font-bold tracking-widest">CYBER HIERARCHY MATRIX</span>
              <span className="text-[#00ff41]/40 font-mono text-xs">// هرم الخطر السيبراني</span>
            </div>
            <div className="flex items-center gap-2">
              {/* Tab switcher */}
              <div className="flex gap-1 bg-black/40 border border-[#1f1f1f] rounded-lg p-1">
                <button onClick={() => setTab("pyramid")}
                  className={`px-3 py-1 rounded text-xs font-mono transition-all ${tab === "pyramid" ? "bg-[#00ff41]/20 text-[#00ff41]" : "text-[#00ff41]/40 hover:text-[#00ff41]/70"}`}>
                  PYRAMID
                </button>
                <button onClick={() => setTab("weapons")}
                  className={`px-3 py-1 rounded text-xs font-mono transition-all ${tab === "weapons" ? "bg-[#e21227]/20 text-[#e21227]" : "text-[#e21227]/40 hover:text-[#e21227]/70"}`}>
                  WEAPONS
                </button>
              </div>
              <button onClick={() => onOpenChange(false)}
                className="p-1.5 rounded-lg border border-[#1f1f1f] text-[#00ff41]/50 hover:text-[#00ff41] hover:border-[#00ff41]/40 transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Left — level list */}
          <div className="absolute left-4 top-16 bottom-4 z-10 flex flex-col gap-1.5 w-52">
            <div className="text-[10px] font-mono text-[#00ff41]/40 tracking-widest mb-1 px-1">// مستويات الخطر</div>
            {LEVELS.map((lv2, i) => {
              const Icon = lv2.icon;
              return (
                <motion.button
                  key={lv2.id}
                  onClick={() => { setSelectedLevel(prev => prev === i ? null : i); setTab("pyramid"); }}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-all text-left"
                  style={{
                    borderColor: selectedLevel === i ? lv2.color + "66" : "#1f1f1f",
                    background: selectedLevel === i ? lv2.color + "15" : "rgba(0,0,0,0.5)",
                    backdropFilter: "blur(8px)",
                  }}
                  whileHover={{ x: 3 }} whileTap={{ scale: 0.97 }}
                >
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: lv2.color }} />
                  <div className="min-w-0">
                    <div className="font-mono text-xs font-bold truncate" style={{ color: lv2.color }}>
                      L{lv2.rank} — {lv2.name}
                    </div>
                    <div className="text-[10px] text-[#ffffff]/40 truncate">{lv2.sub}</div>
                  </div>
                  {selectedLevel === i && <ChevronRight className="w-3 h-3 ml-auto flex-shrink-0" style={{ color: lv2.color }} />}
                </motion.button>
              );
            })}

            {/* Danger index */}
            <div className="mt-3 px-3 py-2.5 rounded-lg border border-[#1f1f1f] bg-black/50 backdrop-blur-sm">
              <div className="text-[10px] font-mono text-[#ffffff]/40 mb-2">THREAT RATING</div>
              {LEVELS.map(lv2 => (
                <div key={lv2.id} className="flex items-center gap-2 mb-1">
                  <div className="text-[10px] font-mono w-8" style={{ color: lv2.color }}>L{lv2.rank}</div>
                  <div className="flex-1 h-1.5 bg-[#111] rounded-full overflow-hidden">
                    <motion.div className="h-full rounded-full" style={{ background: lv2.color }}
                      initial={{ width: 0 }} animate={{ width: `${lv2.dangerPct}%` }}
                      transition={{ delay: lv2.id * 0.1 + 0.3, duration: 0.8, ease: "easeOut" }} />
                  </div>
                  <div className="text-[10px] font-mono" style={{ color: lv2.color }}>{lv2.dangerPct}%</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — weapons panel (tab=weapons) */}
          <AnimatePresence>
            {tab === "weapons" && (
              <motion.div
                className="absolute right-4 top-16 bottom-4 z-10 w-64 flex flex-col gap-2"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
              >
                <div className="text-[10px] font-mono text-[#e21227]/60 tracking-widest mb-1 px-1">// الأسلحة السيبرانية الفتّاكة</div>
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
                    <div className="text-[10px] text-[#ffffff]/40 mb-1">{w.sub}</div>
                    {selectedWeapon === w.id && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                        className="text-[11px] text-[#ffffff]/70 leading-relaxed border-t mt-2 pt-2"
                        style={{ borderColor: w.color + "33" }}>
                        {w.desc}
                      </motion.div>
                    )}
                  </motion.button>
                ))}

                {/* Ghost protocol quote */}
                <div className="mt-2 px-3 py-3 rounded-lg border border-[#e21227]/20 bg-[#e21227]/05 backdrop-blur-sm">
                  <div className="font-mono text-[10px] text-[#e21227]/80 leading-relaxed">
                    "نحن لا نخترق الأنظمة.. نحن نملك الواقع الرقمي بالكامل."
                  </div>
                  <div className="font-mono text-[10px] text-[#e21227]/40 mt-1">— KaliGPT // OMNI-MATRIX</div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bottom — selected level detail */}
          <AnimatePresence>
            {lv && tab === "pyramid" && (
              <motion.div
                key={lv.id}
                className="absolute bottom-4 left-[220px] right-4 z-10 rounded-xl border p-4"
                style={{ borderColor: lv.color + "44", background: "rgba(2,4,8,0.88)", backdropFilter: "blur(16px)" }}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
                transition={{ type: "spring", stiffness: 320, damping: 28 }}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center border"
                    style={{ borderColor: lv.color + "44", background: lv.color + "15" }}>
                    <lv.icon className="w-5 h-5" style={{ color: lv.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-mono text-sm font-bold" style={{ color: lv.color }}>{lv.label}</span>
                      <span className="font-mono text-xs text-[#ffffff]/40">—</span>
                      <span className="font-mono text-sm font-bold text-white">{lv.name}</span>
                      <div className="ml-auto flex items-center gap-1.5">
                        <Zap className="w-3 h-3" style={{ color: lv.color }} />
                        <div className="h-1.5 w-20 bg-[#111] rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${lv.dangerPct}%`, background: lv.color }} />
                        </div>
                        <span className="font-mono text-xs" style={{ color: lv.color }}>{lv.dangerPct}%</span>
                      </div>
                    </div>
                    <div className="text-xs font-mono text-[#ffffff]/50 mb-2">{lv.sub}</div>
                    <p className="text-sm text-[#ffffff]/80 leading-relaxed mb-3">{lv.desc}</p>
                    <div className="flex flex-wrap gap-1.5">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded"
                        style={{ background: lv.color + "18", color: lv.color, border: `1px solid ${lv.color}33` }}>
                        {lv.threat}
                      </span>
                      {lv.tags.map(tag => (
                        <span key={tag} className="text-[10px] font-mono px-2 py-0.5 rounded border border-[#1f1f1f] text-[#ffffff]/50">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button onClick={() => setSelectedLevel(null)}
                    className="p-1 rounded text-[#ffffff]/30 hover:text-[#ffffff]/70 transition-colors flex-shrink-0">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Top-right — concepts ticker */}
          <div className="absolute top-16 right-4 z-10 w-64" style={{ display: tab === "pyramid" ? "block" : "none" }}>
            <div className="px-3 py-2.5 rounded-lg border border-[#1f1f1f] bg-black/55 backdrop-blur-sm">
              <div className="text-[10px] font-mono text-[#00e5ff]/50 tracking-widest mb-2">// مفاهيم الحرب السيبرانية</div>
              {[
                { label: "Zero-Click Exploit", color: "#00e5ff", desc: "اختراق بدون أي تفاعل" },
                { label: "Ghost Protocol C2", color: "#8b5cf6", desc: "خوادم تحكم شبحية" },
                { label: "SCADA Kinetic Strike", color: "#e21227", desc: "تدمير بنية تحتية فيزيائي" },
                { label: "BGP/DNS Hijack", color: "#f97316", desc: "إعادة توجيه الإنترنت" },
                { label: "Supply Chain Subversion", color: "#00ff41", desc: "أبواب خلفية في المصنع" },
              ].map((c, ci) => (
                <div key={ci} className="flex items-start gap-2 mb-1.5">
                  <div className="w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0" style={{ background: c.color }} />
                  <div>
                    <div className="font-mono text-[10px] font-bold" style={{ color: c.color }}>{c.label}</div>
                    <div className="text-[10px] text-[#ffffff]/40">{c.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Scan line overlay */}
          <div className="absolute inset-0 pointer-events-none z-[5]"
            style={{ background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,65,0.012) 2px, rgba(0,255,65,0.012) 4px)" }} />

          {/* Corner accents */}
          <div className="absolute top-16 left-[220px] w-6 h-6 border-t-2 border-l-2 border-[#00ff41]/30 z-10 mt-1 ml-1" />
          <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-[#00ff41]/30 z-10 mb-0 mr-0" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
