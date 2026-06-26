import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, AlertTriangle, TrendingUp, Database, RefreshCw, Filter } from "lucide-react";
import * as THREE from "three";

/* ─── Data ─────────────────────────────────────────────────────────────────── */
interface CVERecord {
  id: string;
  vendor: string;
  product: string;
  cvss: number;
  dateAdded: string;  // YYYY-MM-DD
  type: string;
  exploited: boolean;
}

const CISA_KEV: CVERecord[] = [
  { id:"CVE-2024-3094", vendor:"Tukaani",     product:"XZ Utils",          cvss:10.0, dateAdded:"2024-03-29", type:"Backdoor",      exploited:true  },
  { id:"CVE-2024-21762",vendor:"Fortinet",    product:"FortiOS",           cvss:9.8,  dateAdded:"2024-02-08", type:"RCE",           exploited:true  },
  { id:"CVE-2024-1709", vendor:"ConnectWise", product:"ScreenConnect",     cvss:10.0, dateAdded:"2024-02-22", type:"Auth Bypass",   exploited:true  },
  { id:"CVE-2024-6387", vendor:"OpenSSH",     product:"sshd",              cvss:8.1,  dateAdded:"2024-07-02", type:"RCE",           exploited:false },
  { id:"CVE-2024-4577", vendor:"PHP Group",   product:"PHP CGI",           cvss:9.8,  dateAdded:"2024-06-07", type:"RCE",           exploited:true  },
  { id:"CVE-2023-44487",vendor:"Multiple",    product:"HTTP/2 Servers",    cvss:7.5,  dateAdded:"2023-10-10", type:"DDoS",          exploited:true  },
  { id:"CVE-2023-4863", vendor:"Google",      product:"Chrome/libwebp",    cvss:8.8,  dateAdded:"2023-09-15", type:"Heap Overflow", exploited:true  },
  { id:"CVE-2023-36884",vendor:"Microsoft",   product:"Office/Windows",    cvss:8.3,  dateAdded:"2023-07-11", type:"RCE",           exploited:true  },
  { id:"CVE-2023-23397",vendor:"Microsoft",   product:"Outlook",           cvss:9.8,  dateAdded:"2023-03-14", type:"Zero-Click",    exploited:true  },
  { id:"CVE-2024-27198",vendor:"JetBrains",   product:"TeamCity",          cvss:9.8,  dateAdded:"2024-03-05", type:"Auth Bypass",   exploited:true  },
  { id:"CVE-2024-23113",vendor:"Fortinet",    product:"FortiOS",           cvss:9.8,  dateAdded:"2024-10-09", type:"RCE",           exploited:true  },
  { id:"CVE-2024-30078",vendor:"Microsoft",   product:"Windows WiFi",      cvss:8.8,  dateAdded:"2024-06-11", type:"RCE",           exploited:false },
  { id:"CVE-2024-38189",vendor:"Microsoft",   product:"Project",           cvss:8.8,  dateAdded:"2024-08-13", type:"RCE",           exploited:true  },
  { id:"CVE-2024-38217",vendor:"Microsoft",   product:"Windows",           cvss:5.4,  dateAdded:"2024-09-10", type:"Security Bypass",exploited:true },
  { id:"CVE-2024-43461",vendor:"Microsoft",   product:"Windows MSHTML",    cvss:8.8,  dateAdded:"2024-09-10", type:"Spoofing",      exploited:true  },
  { id:"CVE-2024-47575",vendor:"Fortinet",    product:"FortiManager",      cvss:9.8,  dateAdded:"2024-10-23", type:"RCE",           exploited:true  },
  { id:"CVE-2024-49138",vendor:"Microsoft",   product:"Windows CLFS",      cvss:7.8,  dateAdded:"2024-12-10", type:"Priv Esc",      exploited:true  },
  { id:"CVE-2025-0282", vendor:"Ivanti",      product:"Connect Secure",    cvss:9.0,  dateAdded:"2025-01-08", type:"Stack Overflow",exploited:true  },
  { id:"CVE-2025-0283", vendor:"Ivanti",      product:"Connect Secure",    cvss:7.0,  dateAdded:"2025-01-08", type:"Priv Esc",      exploited:false },
  { id:"CVE-2025-21333",vendor:"Microsoft",   product:"Hyper-V",           cvss:7.8,  dateAdded:"2025-01-14", type:"Priv Esc",      exploited:true  },
  { id:"CVE-2025-21334",vendor:"Microsoft",   product:"Hyper-V",           cvss:7.8,  dateAdded:"2025-01-14", type:"Priv Esc",      exploited:true  },
  { id:"CVE-2025-23006",vendor:"SonicWall",   product:"SMA",               cvss:9.8,  dateAdded:"2025-01-22", type:"Deserialization",exploited:true },
  { id:"CVE-2024-12084",vendor:"rsync",       product:"rsync daemon",      cvss:9.8,  dateAdded:"2025-01-14", type:"Heap Overflow", exploited:false },
  { id:"CVE-2025-24200",vendor:"Apple",       product:"iOS/iPadOS",        cvss:6.1,  dateAdded:"2025-02-05", type:"Auth Bypass",   exploited:true  },
  { id:"CVE-2025-24201",vendor:"Apple",       product:"Safari/WebKit",     cvss:8.8,  dateAdded:"2025-03-12", type:"Out-of-Bounds", exploited:true  },
  { id:"CVE-2025-21418",vendor:"Microsoft",   product:"AFD.sys",           cvss:7.8,  dateAdded:"2025-02-11", type:"Priv Esc",      exploited:true  },
  { id:"CVE-2025-21391",vendor:"Microsoft",   product:"Windows Storage",   cvss:7.1,  dateAdded:"2025-02-11", type:"Deletion",      exploited:true  },
  { id:"CVE-2025-26633",vendor:"Microsoft",   product:"MMC",               cvss:7.0,  dateAdded:"2025-03-11", type:"Security Bypass",exploited:true },
  { id:"CVE-2025-26630",vendor:"Microsoft",   product:"Access",            cvss:7.8,  dateAdded:"2025-03-11", type:"RCE",           exploited:true  },
  { id:"CVE-2025-29824",vendor:"Microsoft",   product:"CLFS Driver",       cvss:7.8,  dateAdded:"2025-04-08", type:"Priv Esc",      exploited:true  },
  { id:"CVE-2025-27363",vendor:"Meta",        product:"FreeType",          cvss:8.1,  dateAdded:"2025-03-13", type:"Memory Corruption",exploited:true },
  { id:"CVE-2025-1268", vendor:"Canon",       product:"Printer Drivers",   cvss:9.4,  dateAdded:"2025-03-28", type:"Out-of-Bounds", exploited:false },
  { id:"CVE-2025-2492", vendor:"ASUS",        product:"AiCloud",           cvss:9.2,  dateAdded:"2025-05-09", type:"Auth Bypass",   exploited:true  },
  { id:"CVE-2025-32433",vendor:"Erlang/OTP",  product:"SSH",               cvss:10.0, dateAdded:"2025-04-16", type:"RCE",           exploited:true  },
  { id:"CVE-2025-31324",vendor:"SAP",         product:"NetWeaver",         cvss:10.0, dateAdded:"2025-04-25", type:"RCE",           exploited:true  },
  { id:"CVE-2025-32756",vendor:"Fortinet",    product:"FortiVoice",        cvss:9.8,  dateAdded:"2025-05-13", type:"Stack Overflow",exploited:true  },
  { id:"CVE-2025-30065",vendor:"Apache",      product:"Parquet",           cvss:10.0, dateAdded:"2025-04-02", type:"Deserialization",exploited:false},
  { id:"CVE-2025-4427", vendor:"Ivanti",      product:"EPMM",              cvss:5.3,  dateAdded:"2025-05-13", type:"Auth Bypass",   exploited:true  },
  { id:"CVE-2025-34028",vendor:"Commvault",   product:"Command Center",    cvss:10.0, dateAdded:"2025-05-22", type:"RCE",           exploited:true  },
  { id:"CVE-2025-3248", vendor:"Langflow",    product:"Langflow AI",       cvss:9.8,  dateAdded:"2025-05-05", type:"Code Injection",exploited:true  },
  { id:"CVE-2025-42599",vendor:"Qualitia",    product:"Active! Mail",      cvss:9.8,  dateAdded:"2025-04-28", type:"Stack Overflow",exploited:true  },
  { id:"CVE-2025-38491",vendor:"Netgear",     product:"SOHO Routers",      cvss:9.8,  dateAdded:"2025-05-19", type:"RCE",           exploited:true  },
  { id:"CVE-2024-55591",vendor:"Fortinet",    product:"FortiOS/FortiProxy",cvss:9.8,  dateAdded:"2025-01-14", type:"Auth Bypass",   exploited:true  },
  { id:"CVE-2024-38812",vendor:"VMware",      product:"vCenter",           cvss:9.8,  dateAdded:"2024-11-18", type:"Heap Overflow", exploited:true  },
  { id:"CVE-2024-38813",vendor:"VMware",      product:"vCenter",           cvss:7.5,  dateAdded:"2024-11-18", type:"Priv Esc",      exploited:true  },
  { id:"CVE-2024-40711",vendor:"Veeam",       product:"Backup",            cvss:9.8,  dateAdded:"2024-10-15", type:"Deserialization",exploited:true },
  { id:"CVE-2024-45519",vendor:"Synacor",     product:"Zimbra",            cvss:10.0, dateAdded:"2024-10-02", type:"RCE",           exploited:true  },
  { id:"CVE-2024-8190", vendor:"Ivanti",      product:"CSA",               cvss:7.2,  dateAdded:"2024-09-13", type:"OS Injection",  exploited:true  },
  { id:"CVE-2024-37085",vendor:"VMware",      product:"ESXi",              cvss:6.8,  dateAdded:"2024-07-30", type:"Auth Bypass",   exploited:true  },
  { id:"CVE-2024-21887",vendor:"Ivanti",      product:"Connect Secure",    cvss:9.1,  dateAdded:"2024-01-10", type:"OS Injection",  exploited:true  },
];

function cvssColor(s: number): string {
  if (s >= 9.0) return "#ff2020";
  if (s >= 7.0) return "#f97316";
  if (s >= 4.0) return "#fbbf24";
  return "#22c55e";
}

function cvssLabel(s: number): string {
  if (s >= 9.0) return "CRITICAL";
  if (s >= 7.0) return "HIGH";
  if (s >= 4.0) return "MEDIUM";
  return "LOW";
}

function dateToMs(d: string) { return new Date(d).getTime(); }

/* ─── Modal props ──────────────────────────────────────────────────────────── */
interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

/* ─── THREE.js building blocks ─────────────────────────────────────────────── */
function buildBarScene(
  scene: THREE.Scene,
  data: CVERecord[],
  barMeshes: React.MutableRefObject<THREE.Mesh[]>,
  particleSystems: React.MutableRefObject<{ pts: THREE.Points; vel: Float32Array; life: Float32Array }[]>,
) {
  /* Sort by date */
  const sorted = [...data].sort((a, b) => dateToMs(a.dateAdded) - dateToMs(b.dateAdded));
  const N = sorted.length;
  const spacing = 1.05;
  const totalW = (N - 1) * spacing;

  sorted.forEach((cve, i) => {
    const x   = i * spacing - totalW / 2;
    const h   = Math.max(0.12, (cve.cvss / 10) * 5.2);
    const col = new THREE.Color(cvssColor(cve.cvss));

    /* Glow halo (back face, big) */
    const haloGeo = new THREE.BoxGeometry(0.7, h + 0.4, 0.7);
    const haloMat = new THREE.MeshBasicMaterial({
      color: col,
      transparent: true,
      opacity: 0.07,
      side: THREE.BackSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    halo.position.set(x, h / 2, 0);
    scene.add(halo);

    /* Bar body */
    const barGeo = new THREE.BoxGeometry(0.55, h, 0.55);
    const barMat = new THREE.MeshPhongMaterial({
      color: col,
      emissive: col,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.88,
    });
    const bar = new THREE.Mesh(barGeo, barMat);
    bar.position.set(x, h / 2, 0);
    bar.scale.y = 0; // animate in
    bar.userData = { targetY: 1, cve, h, col: col.getHex(), x, h_val: h };
    scene.add(bar);
    barMeshes.current.push(bar);

    /* Top cap glow */
    const capGeo = new THREE.BoxGeometry(0.58, 0.06, 0.58);
    const capMat = new THREE.MeshBasicMaterial({
      color: col, transparent: true, opacity: 0.95,
      blending: THREE.AdditiveBlending,
    });
    const cap = new THREE.Mesh(capGeo, capMat);
    cap.position.set(x, h, 0);
    cap.userData = { isTop: true, bar };
    scene.add(cap);

    /* Scanline on bar face */
    const lineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-0.28, 0, 0.29),
      new THREE.Vector3( 0.28, 0, 0.29),
    ]);
    const lineMat = new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending });
    const scanLine = new THREE.Line(lineGeo, lineMat);
    scanLine.position.set(x, 0, 0);
    scanLine.userData = { isScan: true, h };
    scene.add(scanLine);

    /* Particle emitter for critical bars */
    if (cve.cvss >= 9.0) {
      const pCount = 30;
      const pGeo   = new THREE.BufferGeometry();
      const pPos   = new Float32Array(pCount * 3);
      const pVel   = new Float32Array(pCount * 3);
      const pLife  = new Float32Array(pCount);
      for (let p = 0; p < pCount; p++) {
        pPos[p*3]   = x + (Math.random() - 0.5) * 0.5;
        pPos[p*3+1] = h;
        pPos[p*3+2] = (Math.random() - 0.5) * 0.5;
        pVel[p*3]   = (Math.random() - 0.5) * 0.01;
        pVel[p*3+1] = 0.018 + Math.random() * 0.022;
        pVel[p*3+2] = (Math.random() - 0.5) * 0.01;
        pLife[p]    = Math.random();
      }
      pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
      const pMat = new THREE.PointsMaterial({
        color: col,
        size: 0.07,
        transparent: true,
        opacity: 0.75,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true,
      });
      const pts = new THREE.Points(pGeo, pMat);
      scene.add(pts);
      particleSystems.current.push({ pts, vel: pVel, life: pLife });
    }
  });

  /* Ground grid */
  const gridHelper = new THREE.GridHelper(totalW + 4, Math.floor(totalW + 4), 0x1a1a3a, 0x0d0d20);
  gridHelper.material.opacity = 0.4;
  gridHelper.material.transparent = true;
  scene.add(gridHelper);

  /* Lights */
  scene.add(new THREE.AmbientLight(0x0a0a1a, 3));
  const top = new THREE.DirectionalLight(0xffffff, 1.2);
  top.position.set(0, 10, 5);
  scene.add(top);
  const red = new THREE.PointLight(0xff2020, 1.4, 40);
  red.position.set(-totalW / 3, 6, 4);
  scene.add(red);
  const blue = new THREE.PointLight(0x0050ff, 1.0, 40);
  blue.position.set(totalW / 3, 4, -4);
  scene.add(blue);

  /* Stars */
  const starPos = new Float32Array(4000 * 3);
  for (let i = 0; i < 4000 * 3; i++) starPos[i] = (Math.random() - 0.5) * 200;
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
  scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0x6688aa, size: 0.06, transparent: true, opacity: 0.5 })));

  return sorted;
}

/* ─── Component ─────────────────────────────────────────────────────────────── */
export function CveTimeline3DModal({ open, onOpenChange }: Props) {
  const containerRef    = useRef<HTMLDivElement>(null);
  const rendererRef     = useRef<THREE.WebGLRenderer | null>(null);
  const frameRef        = useRef(0);
  const barMeshes       = useRef<THREE.Mesh[]>([]);
  const particleSystems = useRef<{ pts: THREE.Points; vel: Float32Array; life: Float32Array }[]>([]);
  const sortedDataRef   = useRef<CVERecord[]>([]);
  const hoveredRef      = useRef<number | null>(null);
  const camAngleRef     = useRef(0);
  const autoRotRef      = useRef(true);
  const dragRef         = useRef({ active: false, lastX: 0 });

  const [selected, setSelected]     = useState<CVERecord | null>(null);
  const [filterSev, setFilterSev]   = useState<string>("ALL");
  const [stats, setStats]           = useState({ total: 0, critical: 0, high: 0, exploited: 0 });

  const data = filterSev === "ALL" ? CISA_KEV :
    CISA_KEV.filter(c => cvssLabel(c.cvss) === filterSev);

  useEffect(() => {
    const filtered = filterSev === "ALL" ? CISA_KEV : CISA_KEV.filter(c => cvssLabel(c.cvss) === filterSev);
    setStats({
      total:    filtered.length,
      critical: filtered.filter(c => c.cvss >= 9).length,
      high:     filtered.filter(c => c.cvss >= 7 && c.cvss < 9).length,
      exploited:filtered.filter(c => c.exploited).length,
    });
  }, [filterSev]);

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") onOpenChange(false);
  }, [onOpenChange]);

  useEffect(() => {
    if (open) { window.addEventListener("keydown", handleKey); return () => window.removeEventListener("keydown", handleKey); }
    return undefined;
  }, [open, handleKey]);

  useEffect(() => {
    if (!open || !containerRef.current) return;

    const W = containerRef.current.clientWidth  || 800;
    const H = containerRef.current.clientHeight || 480;

    /* Renderer */
    const renderer = new THREE.WebGLRenderer({
      antialias: true, alpha: true,
      powerPreference: "high-performance",
      precision: "highp",
    });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio * 2, 4));
    renderer.toneMapping    = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    /* Scene */
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020408);
    scene.fog = new THREE.FogExp2(0x020408, 0.02);

    /* Camera */
    const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 500);
    camera.position.set(0, 4, 16);
    camera.lookAt(0, 2, 0);

    /* Build bars */
    barMeshes.current = [];
    particleSystems.current = [];
    const sorted = buildBarScene(scene, data, barMeshes, particleSystems);
    sortedDataRef.current = sorted;

    /* Raycaster for hover */
    const raycaster = new THREE.Raycaster();
    const mouse     = new THREE.Vector2();
    const onMouseMove = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
      mouse.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(barMeshes.current);
      hoveredRef.current = hits.length > 0 ? barMeshes.current.indexOf(hits[0].object as THREE.Mesh) : null;
    };
    const onClick = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
      mouse.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(barMeshes.current);
      if (hits.length > 0) {
        const idx = barMeshes.current.indexOf(hits[0].object as THREE.Mesh);
        setSelected(sortedDataRef.current[idx]);
        autoRotRef.current = false;
        setTimeout(() => { autoRotRef.current = true; }, 4000);
      }
    };

    /* Drag */
    const onMouseDown = (e: MouseEvent) => {
      dragRef.current = { active: true, lastX: e.clientX };
      autoRotRef.current = false;
    };
    const onMouseUp   = () => {
      dragRef.current.active = false;
      setTimeout(() => { autoRotRef.current = true; }, 2500);
    };
    const onDrag = (e: MouseEvent) => {
      if (!dragRef.current.active) return;
      const dx = e.clientX - dragRef.current.lastX;
      camAngleRef.current -= dx * 0.008;
      dragRef.current.lastX = e.clientX;
    };

    const el = renderer.domElement;
    el.addEventListener("mousemove", onMouseMove);
    el.addEventListener("click",     onClick);
    el.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup",   onMouseUp);
    window.addEventListener("mousemove", onDrag);

    /* ResizeObserver */
    const ro = new ResizeObserver(() => {
      if (!containerRef.current) return;
      const nW = containerRef.current.clientWidth;
      const nH = containerRef.current.clientHeight;
      renderer.setSize(nW, nH);
      camera.aspect = nW / nH;
      camera.updateProjectionMatrix();
    });
    if (containerRef.current) ro.observe(containerRef.current);

    /* Scan line objects */
    const scanLines = scene.children.filter(c => c.userData.isScan) as THREE.Line[];

    /* Animation */
    let tick = 0;
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      tick++;

      /* Camera orbit */
      if (autoRotRef.current) camAngleRef.current += 0.003;
      const R = 17, oy = 4;
      camera.position.set(
        Math.sin(camAngleRef.current) * R,
        oy + Math.sin(tick * 0.008) * 0.6,
        Math.cos(camAngleRef.current) * R,
      );
      camera.lookAt(0, 2.5, 0);

      /* Animate bars rising */
      barMeshes.current.forEach((bar, i) => {
        const t = Math.min(1, (tick - i * 2) / 60);
        if (t > 0) bar.scale.y = THREE.MathUtils.lerp(bar.scale.y, 1, 0.08);
      });

      /* Scan lines moving up bars */
      scanLines.forEach(sl => {
        sl.position.y += 0.06;
        if (sl.position.y > sl.userData.h + 0.3) sl.position.y = 0;
        (sl.material as THREE.LineBasicMaterial).opacity = 0.3 + Math.sin(tick * 0.12) * 0.3;
      });

      /* Hover glow */
      barMeshes.current.forEach((bar, i) => {
        const mat = bar.material as THREE.MeshPhongMaterial;
        const isHov = hoveredRef.current === i;
        mat.emissiveIntensity = THREE.MathUtils.lerp(mat.emissiveIntensity, isHov ? 1.8 : 0.5, 0.12);
        bar.scale.x = THREE.MathUtils.lerp(bar.scale.x, isHov ? 1.18 : 1, 0.1);
        bar.scale.z = THREE.MathUtils.lerp(bar.scale.z, isHov ? 1.18 : 1, 0.1);
      });

      /* Particles */
      particleSystems.current.forEach(({ pts, vel, life }) => {
        const pos = pts.geometry.attributes.position.array as Float32Array;
        const n   = pos.length / 3;
        for (let p = 0; p < n; p++) {
          life[p] += 0.012;
          if (life[p] >= 1) life[p] = 0;
          pos[p*3]   += vel[p*3];
          pos[p*3+1] += vel[p*3+1];
          pos[p*3+2] += vel[p*3+2];
          if (life[p] > 0.9) {
            const bar = barMeshes.current.find(b => Math.abs(b.position.x - pos[p*3]) < 0.6);
            if (bar) {
              pos[p*3]   = bar.position.x + (Math.random() - 0.5) * 0.5;
              pos[p*3+1] = bar.userData.h_val ?? 4;
              pos[p*3+2] = (Math.random() - 0.5) * 0.5;
            }
          }
        }
        pts.geometry.attributes.position.needsUpdate = true;
        (pts.material as THREE.PointsMaterial).opacity = 0.5 + Math.sin(tick * 0.05) * 0.25;
      });

      renderer.render(scene, camera);
    };
    frameRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frameRef.current);
      ro.disconnect();
      el.removeEventListener("mousemove", onMouseMove);
      el.removeEventListener("click",     onClick);
      el.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup",   onMouseUp);
      window.removeEventListener("mousemove", onDrag);
      renderer.dispose();
      if (containerRef.current?.contains(renderer.domElement))
        containerRef.current.removeChild(renderer.domElement);
      barMeshes.current = [];
      particleSystems.current = [];
      rendererRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, filterSev]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.92)", backdropFilter: "blur(10px)" }}
          onClick={e => e.target === e.currentTarget && onOpenChange(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 24 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 12 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            className="relative flex flex-col overflow-hidden rounded-[18px]"
            style={{
              width: "clamp(340px, 40vw, 560px)",
              backdropFilter: "blur(40px)",
              background: "rgba(8, 8, 8, 0.96)",
              height: "min(880px, 92vh)",
              border: "1px solid rgba(255,32,32,0.2)",
              boxShadow: "0 0 120px rgba(255,32,32,0.08), 0 0 60px rgba(0,40,80,0.15), 0 40px 100px rgba(0,0,0,0.95)",
            }}
          >
            {/* Top accent bar */}
            <div className="h-[2px] w-full" style={{ background: "linear-gradient(90deg,transparent 0%,#ff2020 20%,#f97316 50%,#ff2020 80%,transparent 100%)" }} />

            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-3 pb-[10px] shrink-0"
              style={{ background: "rgba(255,32,32,0.03)", borderBottom: "1px solid rgba(255,32,32,0.1)" }}>
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{ rotate: [0, 360] }} transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(255,32,32,0.15)", border: "1px solid rgba(255,32,32,0.4)" }}>
                  <Database className="w-4 h-4" style={{ color: "#ff2020" }} />
                </motion.div>
                <div>
                  <div className="text-[11px] font-black tracking-[0.35em] font-mono" style={{ color: "#ff2020" }}>
                    CVE TIMELINE — CISA KEV 3D
                  </div>
                  <div className="text-[8px] font-mono" style={{ color: "rgba(255,255,255,0.25)" }}>
                    KNOWN EXPLOITED VULNERABILITIES · WEBGL VISUALIZATION · DRAG TO ROTATE
                  </div>
                </div>
                <motion.div className="flex items-center gap-1.5 ml-3 px-2 py-1 rounded-full"
                  style={{ background: "rgba(255,32,32,0.08)", border: "1px solid rgba(255,32,32,0.25)" }}
                  animate={{ opacity: [0.7, 1] }}
                  transition={{ duration: 1.2, repeat: Infinity, repeatType: "reverse" }}>
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#ff2020" }} />
                  <span className="text-[8px] font-black font-mono" style={{ color: "#ff2020" }}>CISA KEV</span>
                </motion.div>
              </div>

              <div className="flex items-center gap-5">
                {[
                  { label:"TOTAL",    val:stats.total,     c:"#00e5ff" },
                  { label:"CRITICAL", val:stats.critical,  c:"#ff2020" },
                  { label:"HIGH",     val:stats.high,      c:"#f97316" },
                  { label:"EXPLOITED",val:stats.exploited, c:"#fbbf24" },
                ].map(s => (
                  <div key={s.label} className="text-center">
                    <div className="text-xl font-black font-mono tabular-nums" style={{ color: s.c }}>{s.val}</div>
                    <div className="text-[7px] tracking-[0.2em] font-mono" style={{ color: "rgba(255,255,255,0.18)" }}>{s.label}</div>
                  </div>
                ))}
                <button onClick={() => onOpenChange(false)}
                  className="w-7 h-7 flex items-center justify-center rounded-xl"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)" }}>
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Filter bar */}
            <div className="flex items-center gap-2 px-5 py-2 shrink-0"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", background: "rgba(0,0,0,0.3)" }}>
              <Filter className="w-3 h-3" style={{ color: "rgba(255,255,255,0.3)" }} />
              <span className="text-[9px] font-mono" style={{ color: "rgba(255,255,255,0.3)" }}>FILTER:</span>
              {["ALL","CRITICAL","HIGH","MEDIUM","LOW"].map(f => (
                <button key={f} onClick={() => setFilterSev(f)}
                  className="px-2.5 py-1 rounded-lg text-[9px] font-black font-mono tracking-widest transition-all"
                  style={{
                    background: filterSev === f ? `${cvssColor(f === "CRITICAL" ? 10 : f === "HIGH" ? 8 : f === "MEDIUM" ? 5 : f === "ALL" ? 0 : 2)}22` : "rgba(255,255,255,0.03)",
                    border: `1px solid ${filterSev === f ? cvssColor(f === "CRITICAL" ? 10 : f === "HIGH" ? 8 : f === "MEDIUM" ? 5 : f === "ALL" ? 0 : 2) + "60" : "rgba(255,255,255,0.08)"}`,
                    color: filterSev === f ? cvssColor(f === "CRITICAL" ? 10 : f === "HIGH" ? 8 : f === "MEDIUM" ? 5 : f === "ALL" ? 0 : 2) : "rgba(255,255,255,0.4)",
                  }}>
                  {f}
                </button>
              ))}
              <div className="ml-auto flex items-center gap-1.5">
                {[
                  { c:"#ff2020", l:"CRITICAL (≥9.0)" },
                  { c:"#f97316", l:"HIGH (7.0-8.9)" },
                  { c:"#fbbf24", l:"MEDIUM (4.0-6.9)" },
                  { c:"#22c55e", l:"LOW (<4.0)" },
                ].map(({ c, l }) => (
                  <div key={l} className="flex items-center gap-1">
                    <div className="w-2.5 h-2.5 rounded-sm" style={{ background: c, opacity: 0.85 }} />
                    <span className="text-[8px] font-mono" style={{ color: "rgba(255,255,255,0.3)" }}>{l}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Main content */}
            <div className="flex flex-1 overflow-hidden">
              {/* 3D canvas */}
              <div ref={containerRef} className="flex-1 relative" style={{ cursor: "grab" }}>
                <div className="absolute top-3 left-3 pointer-events-none z-10 space-y-0.5">
                  <div className="text-[7px] font-mono" style={{ color: "rgba(255,32,32,0.4)" }}>CVE-TIMELINE-3D v2.0</div>
                  <div className="text-[7px] font-mono" style={{ color: "rgba(255,255,255,0.15)" }}>DRAG TO ROTATE · CLICK BAR TO INSPECT</div>
                </div>
                {/* Axes labels */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-none z-10">
                  <div className="text-[8px] font-mono text-center" style={{ color: "rgba(255,255,255,0.2)" }}>← DATE ADDED →</div>
                </div>
                <div className="absolute bottom-10 left-3 pointer-events-none z-10">
                  <div className="text-[8px] font-mono writing-vertical" style={{ color: "rgba(255,255,255,0.2)" }}>CVSS ↑</div>
                </div>
              </div>

              {/* Right panel */}
              <div className="w-[260px] flex flex-col shrink-0"
                style={{ borderLeft: "1px solid rgba(255,255,255,0.05)", background: "rgba(2,4,8,0.7)" }}>

                {/* Selected CVE detail */}
                <AnimatePresence mode="wait">
                  {selected ? (
                    <motion.div key={selected.id}
                      initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                      className="p-3 shrink-0"
                      style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[9px] font-black font-mono px-2 py-0.5 rounded"
                          style={{ background: `${cvssColor(selected.cvss)}20`, color: cvssColor(selected.cvss), border: `1px solid ${cvssColor(selected.cvss)}40` }}>
                          {cvssLabel(selected.cvss)} · CVSS {selected.cvss.toFixed(1)}
                        </span>
                        {selected.exploited && (
                          <span className="text-[8px] font-black font-mono px-1.5 py-0.5 rounded"
                            style={{ background: "rgba(255,32,32,0.15)", color: "#ff2020", border: "1px solid rgba(255,32,32,0.3)" }}>
                            EXPLOIT
                          </span>
                        )}
                      </div>
                      <div className="text-[9px] font-black mb-0.5" style={{ color: cvssColor(selected.cvss) }}>{selected.id}</div>
                      <div className="text-[10px] font-bold text-white mb-0.5">{selected.vendor} · {selected.product}</div>
                      <div className="text-[9px] font-mono" style={{ color: "rgba(255,255,255,0.4)" }}>
                        {selected.type} · {selected.dateAdded}
                      </div>
                      {/* CVSS bar */}
                      <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                        <motion.div className="h-full rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${(selected.cvss / 10) * 100}%` }}
                          transition={{ duration: 0.6, ease: "easeOut" }}
                          style={{ background: `linear-gradient(90deg, ${cvssColor(selected.cvss)}88, ${cvssColor(selected.cvss)})` }} />
                      </div>
                      <div className="flex justify-between mt-0.5">
                        <span className="text-[7px] font-mono" style={{ color: "rgba(255,255,255,0.2)" }}>0</span>
                        <span className="text-[7px] font-mono font-bold" style={{ color: cvssColor(selected.cvss) }}>{selected.cvss.toFixed(1)}</span>
                        <span className="text-[7px] font-mono" style={{ color: "rgba(255,255,255,0.2)" }}>10</span>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div key="placeholder"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="p-3 shrink-0 flex items-center justify-center"
                      style={{ height: 120, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      <div className="text-center">
                        <AlertTriangle className="w-5 h-5 mx-auto mb-1.5" style={{ color: "rgba(255,32,32,0.3)" }} />
                        <div className="text-[9px] font-mono" style={{ color: "rgba(255,255,255,0.2)" }}>
                          انقر على عمود لفحص CVE
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* CVE list */}
                <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
                  <div className="px-2.5 py-2 text-[8px] font-black tracking-[0.2em] font-mono"
                    style={{ color: "rgba(255,32,32,0.6)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    CISA KEV — {data.length} ENTRIES
                  </div>
                  {[...data].sort((a,b) => dateToMs(b.dateAdded) - dateToMs(a.dateAdded)).map(cve => (
                    <button key={cve.id} onClick={() => setSelected(cve)}
                      className="w-full text-left px-2.5 py-2 transition-all hover:opacity-100"
                      style={{
                        borderBottom: "1px solid rgba(255,255,255,0.03)",
                        background: selected?.id === cve.id ? `${cvssColor(cve.cvss)}09` : "transparent",
                        opacity: selected?.id === cve.id ? 1 : 0.75,
                      }}>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[8px] font-black font-mono" style={{ color: cvssColor(cve.cvss) }}>
                          {cve.id.split("-").slice(-1)[0]}
                        </span>
                        <div className="flex items-center gap-1">
                          {cve.exploited && <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#ff2020" }} />}
                          <span className="text-[8px] font-mono font-bold" style={{ color: cvssColor(cve.cvss) }}>{cve.cvss.toFixed(1)}</span>
                        </div>
                      </div>
                      <div className="text-[8px] font-semibold" style={{ color: "rgba(255,255,255,0.65)" }}>
                        {cve.vendor} · {cve.type}
                      </div>
                      <div className="text-[7px] font-mono" style={{ color: "rgba(255,255,255,0.25)" }}>{cve.dateAdded}</div>
                    </button>
                  ))}
                </div>

                {/* Footer */}
                <div className="p-2.5 shrink-0 space-y-1"
                  style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                  {[
                    { icon:Database,    c:"#00e5ff", t:`${CISA_KEV.length} إدخال من قاعدة CISA KEV` },
                    { icon:TrendingUp,  c:"#f97316", t:"مرتبة حسب تاريخ الإضافة"            },
                    { icon:AlertTriangle,c:"#ff2020",t:"الأعمدة الحمراء = مستغلة فعلياً"    },
                  ].map(i => (
                    <div key={i.t} className="flex items-center gap-1.5">
                      <i.icon className="w-2.5 h-2.5 flex-shrink-0" style={{ color: i.c }} />
                      <span className="text-[7px] font-mono" style={{ color: "rgba(255,255,255,0.22)" }}>{i.t}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
