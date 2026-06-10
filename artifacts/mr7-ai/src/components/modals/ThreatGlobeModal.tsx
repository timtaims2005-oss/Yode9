import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Globe, Zap, Shield, Activity, Eye, Crosshair, Wifi, AlertTriangle, Radio } from "lucide-react";
import * as THREE from "three";

interface ThreatGlobeModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

type AttackEvent = {
  id: number;
  srcLat: number; srcLon: number;
  dstLat: number; dstLon: number;
  type: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  src: string;
  dst: string;
  ts: string;
  color: string;
};

const SEVERITY_COLOR: Record<string, string> = {
  CRITICAL: "#e21227",
  HIGH: "#f97316",
  MEDIUM: "#fbbf24",
  LOW: "#10b981",
};

const ATTACK_TYPES = ["SQL Injection","RCE","XSS","DDoS","Brute Force","Zero-Day","Ransomware","APT","Phishing","Exfil"];
const COUNTRIES = [
  { name: "USA", lat: 37.09, lon: -95.71 },
  { name: "Russia", lat: 61.52, lon: 105.31 },
  { name: "China", lat: 35.86, lon: 104.19 },
  { name: "Germany", lat: 51.16, lon: 10.45 },
  { name: "Brazil", lat: -14.23, lon: -51.92 },
  { name: "India", lat: 20.59, lon: 78.96 },
  { name: "UK", lat: 55.37, lon: -3.43 },
  { name: "Japan", lat: 36.20, lon: 138.25 },
  { name: "Australia", lat: -25.27, lon: 133.77 },
  { name: "Iran", lat: 32.42, lon: 53.68 },
  { name: "N.Korea", lat: 40.33, lon: 127.51 },
  { name: "Ukraine", lat: 48.37, lon: 31.16 },
  { name: "France", lat: 46.22, lon: 2.21 },
  { name: "Canada", lat: 56.13, lon: -106.34 },
  { name: "Israel", lat: 31.04, lon: 34.85 },
];

function latLonToVec3(lat: number, lon: number, r: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta)
  );
}

function makeArc(src: THREE.Vector3, dst: THREE.Vector3, segments = 64): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  const mid = new THREE.Vector3().addVectors(src, dst).multiplyScalar(0.5);
  const len = src.distanceTo(dst);
  mid.normalize().multiplyScalar(mid.length() + len * 0.4);
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const p = new THREE.Vector3();
    p.x = (1-t)*(1-t)*src.x + 2*(1-t)*t*mid.x + t*t*dst.x;
    p.y = (1-t)*(1-t)*src.y + 2*(1-t)*t*mid.y + t*t*dst.y;
    p.z = (1-t)*(1-t)*src.z + 2*(1-t)*t*mid.z + t*t*dst.z;
    points.push(p);
  }
  return points;
}

let evId = 0;
function rndAttack(): AttackEvent {
  const sev = (["CRITICAL","HIGH","MEDIUM","LOW"] as const)[Math.floor(Math.random()*4)];
  const s = COUNTRIES[Math.floor(Math.random()*COUNTRIES.length)];
  let d = COUNTRIES[Math.floor(Math.random()*COUNTRIES.length)];
  while (d.name === s.name) d = COUNTRIES[Math.floor(Math.random()*COUNTRIES.length)];
  return {
    id: evId++,
    srcLat: s.lat + (Math.random()-0.5)*8,
    srcLon: s.lon + (Math.random()-0.5)*8,
    dstLat: d.lat + (Math.random()-0.5)*8,
    dstLon: d.lon + (Math.random()-0.5)*8,
    type: ATTACK_TYPES[Math.floor(Math.random()*ATTACK_TYPES.length)],
    severity: sev,
    src: s.name,
    dst: d.name,
    ts: new Date().toLocaleTimeString("en-US",{hour12:false}),
    color: SEVERITY_COLOR[sev],
  };
}

export function ThreatGlobeModal({ open, onOpenChange }: ThreatGlobeModalProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const globeRef = useRef<THREE.Mesh | null>(null);
  const arcsRef = useRef<{ line: THREE.Line; progress: number; speed: number; color: string; dot: THREE.Mesh }[]>([]);
  const frameRef = useRef<number>(0);
  const [events, setEvents] = useState<AttackEvent[]>([]);
  const [stats, setStats] = useState({ total: 0, critical: 0, active: 0 });

  useEffect(() => {
    if (!open || !canvasRef.current) return;

    const W = canvasRef.current.clientWidth;
    const H = canvasRef.current.clientHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    canvasRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 1000);
    camera.position.set(0, 0, 3.2);
    cameraRef.current = camera;

    // Globe
    const geoSphere = new THREE.SphereGeometry(1, 64, 64);
    const matGlobe = new THREE.MeshPhongMaterial({
      color: 0x0a1a2e,
      emissive: 0x061020,
      wireframe: false,
      transparent: true,
      opacity: 0.95,
    });
    const globe = new THREE.Mesh(geoSphere, matGlobe);
    scene.add(globe);
    globeRef.current = globe;

    // Wireframe overlay
    const wireGeo = new THREE.SphereGeometry(1.002, 32, 32);
    const wireMat = new THREE.MeshBasicMaterial({ color: 0x0d3060, wireframe: true, transparent: true, opacity: 0.15 });
    scene.add(new THREE.Mesh(wireGeo, wireMat));

    // Glow atmosphere
    const atmGeo = new THREE.SphereGeometry(1.08, 32, 32);
    const atmMat = new THREE.MeshBasicMaterial({ color: 0x0050ff, transparent: true, opacity: 0.04, side: THREE.BackSide });
    scene.add(new THREE.Mesh(atmGeo, atmMat));

    // Outer ring
    const ringGeo = new THREE.TorusGeometry(1.18, 0.003, 8, 128);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xe21227, transparent: true, opacity: 0.5 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2.5;
    scene.add(ring);

    // Lights
    scene.add(new THREE.AmbientLight(0x0a1a3e, 2));
    const dirLight = new THREE.DirectionalLight(0x2244ff, 1.5);
    dirLight.position.set(5, 3, 5);
    scene.add(dirLight);
    const redLight = new THREE.PointLight(0xe21227, 0.8, 10);
    redLight.position.set(-2, 1, 2);
    scene.add(redLight);

    // Stars
    const starGeo = new THREE.BufferGeometry();
    const starCount = 1200;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i++) starPos[i] = (Math.random() - 0.5) * 60;
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({ color: 0x8888ff, size: 0.05, transparent: true, opacity: 0.6 });
    scene.add(new THREE.Points(starGeo, starMat));

    // Country dots
    COUNTRIES.forEach(c => {
      const v = latLonToVec3(c.lat, c.lon, 1.01);
      const dg = new THREE.SphereGeometry(0.012, 6, 6);
      const dm = new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.8 });
      const dot = new THREE.Mesh(dg, dm);
      dot.position.copy(v);
      scene.add(dot);
    });

    // Mouse drag
    let isDragging = false;
    let prevMouse = { x: 0, y: 0 };
    const el = renderer.domElement;
    const onDown = (e: MouseEvent) => { isDragging = true; prevMouse = { x: e.clientX, y: e.clientY }; };
    const onUp = () => { isDragging = false; };
    const onMove = (e: MouseEvent) => {
      if (!isDragging || !globe) return;
      const dx = e.clientX - prevMouse.x;
      const dy = e.clientY - prevMouse.y;
      globe.rotation.y += dx * 0.005;
      globe.rotation.x += dy * 0.003;
      prevMouse = { x: e.clientX, y: e.clientY };
    };
    el.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("mousemove", onMove);

    // Animation
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      globe.rotation.y += 0.0015;
      ring.rotation.z += 0.002;

      arcsRef.current = arcsRef.current.filter(a => {
        a.progress = Math.min(1, a.progress + a.speed);
        const pts = (a.line.geometry as THREE.BufferGeometry).attributes.position;
        const total = pts.count;
        const show = Math.floor(a.progress * total);
        const pos = new Float32Array(show * 3);
        for (let i = 0; i < show; i++) {
          pos[i*3] = pts.getX(i);
          pos[i*3+1] = pts.getY(i);
          pos[i*3+2] = pts.getZ(i);
        }
        const newGeo = new THREE.BufferGeometry();
        newGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
        a.line.geometry.dispose();
        a.line.geometry = newGeo;

        // Move dot along arc
        if (show > 0) {
          const idx = Math.min(show - 1, total - 1);
          a.dot.position.set(pts.getX(idx), pts.getY(idx), pts.getZ(idx));
        }
        (a.line.material as THREE.LineBasicMaterial).opacity = a.progress < 0.9 ? 0.85 : 1 - ((a.progress - 0.9) / 0.1);
        if (a.progress >= 1) { scene.remove(a.line); scene.remove(a.dot); a.line.geometry.dispose(); return false; }
        return true;
      });

      renderer.render(scene, camera);
    };
    animate();

    // Spawn attacks
    const spawnArc = () => {
      if (!sceneRef.current || !globeRef.current) return;
      const ev = rndAttack();
      setEvents(prev => [ev, ...prev].slice(0, 12));
      setStats(prev => ({
        total: prev.total + 1,
        critical: prev.critical + (ev.severity === "CRITICAL" ? 1 : 0),
        active: arcsRef.current.length + 1,
      }));

      const src3 = latLonToVec3(ev.srcLat, ev.srcLon, 1.01);
      const dst3 = latLonToVec3(ev.dstLat, ev.dstLon, 1.01);
      const arcPts = makeArc(src3, dst3);
      const geo = new THREE.BufferGeometry().setFromPoints(arcPts);
      const mat = new THREE.LineBasicMaterial({ color: new THREE.Color(ev.color), transparent: true, opacity: 0.85, linewidth: 2 });
      const line = new THREE.Line(geo, mat);
      line.rotation.copy(globeRef.current.rotation);
      sceneRef.current.add(line);

      const dotGeo = new THREE.SphereGeometry(0.018, 8, 8);
      const dotMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(ev.color) });
      const dot = new THREE.Mesh(dotGeo, dotMat);
      dot.rotation.copy(globeRef.current.rotation);
      sceneRef.current.add(dot);

      arcsRef.current.push({ line, progress: 0, speed: 0.012 + Math.random() * 0.015, color: ev.color, dot });
    };

    const iv1 = setInterval(spawnArc, 900);
    const iv2 = setInterval(() => {
      setStats(prev => ({ ...prev, active: arcsRef.current.length }));
    }, 500);

    // Seed initial
    for (let i = 0; i < 5; i++) setTimeout(spawnArc, i * 200);

    return () => {
      cancelAnimationFrame(frameRef.current);
      clearInterval(iv1);
      clearInterval(iv2);
      el.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("mousemove", onMove);
      renderer.dispose();
      if (canvasRef.current && renderer.domElement.parentNode === canvasRef.current) {
        canvasRef.current.removeChild(renderer.domElement);
      }
      arcsRef.current = [];
      rendererRef.current = null;
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && onOpenChange(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="relative w-[95vw] max-w-[1300px] h-[88vh] flex flex-col rounded-2xl overflow-hidden border border-[#1a1a1a]"
            style={{ background: "linear-gradient(135deg,#050510 0%,#0a0a1e 50%,#050510 100%)" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#111] shrink-0"
              style={{ background: "rgba(226,18,39,0.05)" }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: "rgba(226,18,39,0.15)", border: "1px solid rgba(226,18,39,0.4)" }}>
                  <Globe className="w-4 h-4" style={{ color: "#e21227" }} />
                </div>
                <div>
                  <div className="text-[11px] font-black tracking-[0.3em] font-mono" style={{ color: "#e21227" }}>THREAT GLOBE</div>
                  <div className="text-[9px] font-mono" style={{ color: "rgba(255,255,255,0.3)" }}>REAL-TIME CYBER ATTACK VISUALIZATION · 3D INTERACTIVE</div>
                </div>
                <div className="flex items-center gap-1 ml-4">
                  <div className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
                  <span className="text-[9px] font-mono" style={{ color: "#10b981" }}>LIVE</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {[
                  { label: "TOTAL", val: stats.total, color: "#00e5ff" },
                  { label: "CRITICAL", val: stats.critical, color: "#e21227" },
                  { label: "ACTIVE ARCS", val: stats.active, color: "#fbbf24" },
                ].map(s => (
                  <div key={s.label} className="text-center">
                    <div className="text-base font-mono font-black" style={{ color: s.color }}>{s.val}</div>
                    <div className="text-[8px] font-mono" style={{ color: "rgba(255,255,255,0.2)" }}>{s.label}</div>
                  </div>
                ))}
                <button onClick={() => onOpenChange(false)}
                  className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                  style={{ color: "rgba(255,255,255,0.4)" }}>
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Main layout */}
            <div className="flex flex-1 overflow-hidden">
              {/* Globe canvas */}
              <div ref={canvasRef} className="flex-1 relative" style={{ cursor: "grab" }}>
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="absolute top-4 left-4 text-[9px] font-mono" style={{ color: "rgba(255,255,255,0.15)" }}>
                    DRAG TO ROTATE · INTERACTIVE
                  </div>
                </div>
                {/* Severity legend */}
                <div className="absolute bottom-4 left-4 space-y-1 pointer-events-none">
                  {Object.entries(SEVERITY_COLOR).map(([k,v]) => (
                    <div key={k} className="flex items-center gap-2">
                      <div className="w-3 h-0.5 rounded" style={{ background: v }} />
                      <span className="text-[8px] font-mono font-bold" style={{ color: v }}>{k}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Event feed */}
              <div className="w-[280px] border-l border-[#111] flex flex-col shrink-0">
                <div className="px-3 py-2 border-b border-[#0f0f0f]">
                  <div className="flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5" style={{ color: "#e21227" }} />
                    <span className="text-[10px] font-black font-mono tracking-widest" style={{ color: "#e21227" }}>LIVE FEED</span>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto space-y-0.5 p-2">
                  <AnimatePresence>
                    {events.map(ev => (
                      <motion.div
                        key={ev.id}
                        initial={{ x: 30, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="p-2 rounded-lg text-left"
                        style={{ background: `${ev.color}08`, border: `1px solid ${ev.color}20` }}
                      >
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[9px] font-black font-mono px-1.5 py-0.5 rounded"
                            style={{ background: `${ev.color}20`, color: ev.color }}>{ev.severity}</span>
                          <span className="text-[7px] font-mono" style={{ color: "rgba(255,255,255,0.2)" }}>{ev.ts}</span>
                        </div>
                        <div className="text-[9px] font-bold mt-0.5" style={{ color: "rgba(255,255,255,0.8)" }}>{ev.type}</div>
                        <div className="text-[8px] font-mono" style={{ color: "rgba(255,255,255,0.35)" }}>
                          {ev.src} <span style={{ color: ev.color }}>→</span> {ev.dst}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
                {/* Bottom legend */}
                <div className="p-3 border-t border-[#0f0f0f] space-y-1">
                  {[
                    { icon: Zap, label: "Attack arcs: real-time", color: "#e21227" },
                    { icon: Shield, label: "Globe: drag to rotate", color: "#00e5ff" },
                    { icon: Eye, label: "Data: simulated live", color: "#10b981" },
                  ].map(i => (
                    <div key={i.label} className="flex items-center gap-2">
                      <i.icon className="w-3 h-3" style={{ color: i.color }} />
                      <span className="text-[8px] font-mono" style={{ color: "rgba(255,255,255,0.25)" }}>{i.label}</span>
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
