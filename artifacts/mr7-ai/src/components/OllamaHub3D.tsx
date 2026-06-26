import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import * as THREE from "three";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Cpu, Download, Trash2, Activity, Zap, Brain, Server,
  Globe, RefreshCw, Terminal, ChevronRight, CheckCircle2,
  Loader2, HardDrive, WifiOff, Play, MemoryStick,
  Network, Layers, Atom,
  BarChart3, Wifi, Shield, FlaskConical, GitCompare,
  Gauge, Trophy, Timer, TrendingUp, Copy, Check, AlertTriangle,
  Bolt, History, Plus,
} from "lucide-react";
import { BenchmarkHistory3D, saveBenchEntry } from "./BenchmarkHistory3D";

/* ══════════════════════════════════════════════════════════════════════
   OLLAMA NEURAL HUB — MAXIMUM EDITION
   Full Three.js orbital system with per-model planets, neural connections,
   particle flow, mouse hover raycasting, streaming chat, live stats.
══════════════════════════════════════════════════════════════════════ */

interface OllamaHubProps { open: boolean; onClose: () => void; }

interface OllamaModel {
  name: string; size: number; digest: string; modified_at: string;
  details?: { parameter_size?: string; quantization_level?: string; family?: string };
}
interface RunningModel { name: string; model: string; size: number; expires_at?: string; }
interface OllamaStatus {
  running: boolean; models: OllamaModel[]; version: string | null;
  binExists?: boolean; dlLog?: string | null;
}

/* ── 22 optimised models for Replit CPU — sorted by size ─────────── */
const REPLIT_MODELS = [
  /* ULTRA — sub-1GB, instant */
  { name: "smollm:135m",        label: "SmolLM 135M",     size: "83MB",  ram: "~0.5GB", speed: "ULTRA", color: "#22d3ee", geo: "tetrahedron",  tag: "HF",    ok: true,  cat: "tiny"   },
  { name: "qwen2.5:0.5b",       label: "Qwen 2.5 0.5B",   size: "395MB", ram: "~1GB",   speed: "ULTRA", color: "#10b981", geo: "sphere",        tag: "ALI",   ok: true,  cat: "tiny"   },
  { name: "tinyllama",           label: "TinyLlama 1.1B",  size: "637MB", ram: "~1GB",   speed: "ULTRA", color: "#f59e0b", geo: "tetrahedron",   tag: "TL",    ok: true,  cat: "tiny"   },
  /* FAST — 1-2GB */
  { name: "smollm:1.7b",        label: "SmolLM 1.7B",     size: "1.0GB", ram: "~1.5GB", speed: "FAST",  color: "#34d399", geo: "octahedron",    tag: "HF",    ok: true,  cat: "small"  },
  { name: "qwen2.5:1.5b",       label: "Qwen 2.5 1.5B",   size: "986MB", ram: "~1.5GB", speed: "FAST",  color: "#a3e635", geo: "icosahedron",   tag: "ALI",   ok: true,  cat: "small"  },
  { name: "deepseek-r1:1.5b",   label: "DeepSeek R1 1.5B",size: "1.1GB", ram: "~2GB",   speed: "FAST",  color: "#0ea5e9", geo: "icosahedron",   tag: "DS",    ok: true,  cat: "reason" },
  { name: "llama3.2:1b",        label: "Llama 3.2 1B",    size: "1.3GB", ram: "~2GB",   speed: "FAST",  color: "#8b5cf6", geo: "dodecahedron",  tag: "META",  ok: true,  cat: "small"  },
  { name: "stablelm2:1.6b",     label: "StableLM 2 1.6B", size: "974MB", ram: "~1.5GB", speed: "FAST",  color: "#facc15", geo: "sphere",        tag: "STAB",  ok: true,  cat: "small"  },
  /* MED — 2-3GB */
  { name: "qwen2.5:3b",         label: "Qwen 2.5 3B",     size: "1.9GB", ram: "~3GB",   speed: "MED",   color: "#4ade80", geo: "sphere",        tag: "ALI",   ok: true,  cat: "mid"    },
  { name: "gemma2:2b",          label: "Gemma 2 2B",      size: "1.6GB", ram: "~3GB",   speed: "MED",   color: "#ec4899", geo: "octahedron",    tag: "GOO",   ok: true,  cat: "mid"    },
  { name: "llama3.2:3b",        label: "Llama 3.2 3B",    size: "2.0GB", ram: "~3GB",   speed: "MED",   color: "#c084fc", geo: "dodecahedron",  tag: "META",  ok: true,  cat: "mid"    },
  { name: "orca-mini:3b",       label: "Orca Mini 3B",    size: "1.9GB", ram: "~3GB",   speed: "MED",   color: "#fb923c", geo: "sphere",        tag: "MSFT",  ok: true,  cat: "mid"    },
  { name: "phi3:mini",          label: "Phi-3 Mini 3.8B", size: "2.2GB", ram: "~4GB",   speed: "MED",   color: "#06b6d4", geo: "torus",         tag: "MS",    ok: true,  cat: "mid"    },
  { name: "phi3.5:mini",        label: "Phi-3.5 Mini",    size: "2.2GB", ram: "~4GB",   speed: "MED",   color: "#67e8f9", geo: "torus",         tag: "MS",    ok: true,  cat: "mid"    },
  /* CODE — 1-4GB */
  { name: "qwen2.5-coder:1.5b", label: "Qwen Coder 1.5B", size: "986MB", ram: "~1.5GB", speed: "FAST",  color: "#38bdf8", geo: "icosahedron",   tag: "CODE",  ok: true,  cat: "code"   },
  { name: "qwen2.5-coder:3b",   label: "Qwen Coder 3B",   size: "1.9GB", ram: "~3GB",   speed: "MED",   color: "#7dd3fc", geo: "dodecahedron",  tag: "CODE",  ok: true,  cat: "code"   },
  { name: "codegemma:2b",       label: "CodeGemma 2B",    size: "1.6GB", ram: "~3GB",   speed: "MED",   color: "#f9a8d4", geo: "octahedron",    tag: "CODE",  ok: true,  cat: "code"   },
  /* EMBED — tiny utility models */
  { name: "all-minilm",         label: "All-MiniLM Embed",size: "46MB",  ram: "~0.5GB", speed: "ULTRA", color: "#a78bfa", geo: "sphere",        tag: "EMBD",  ok: true,  cat: "embed"  },
  { name: "nomic-embed-text",   label: "Nomic Embed Text",size: "274MB", ram: "~0.5GB", speed: "ULTRA", color: "#818cf8", geo: "sphere",        tag: "EMBD",  ok: true,  cat: "embed"  },
  /* HEAVY — 4-8GB (needs 8GB+ RAM) */
  { name: "mistral:7b-q4_0",   label: "Mistral 7B Q4",   size: "4.1GB", ram: "~6GB",   speed: "SLOW",  color: "#f97316", geo: "sphere",        tag: "MIS",   ok: false, cat: "large"  },
  { name: "deepseek-r1:7b",    label: "DeepSeek R1 7B",  size: "4.7GB", ram: "~8GB",   speed: "SLOW",  color: "#0284c7", geo: "icosahedron",   tag: "DS",    ok: false, cat: "large"  },
  { name: "llama3.1:8b-q4_0",  label: "Llama 3.1 8B Q4", size: "4.7GB", ram: "~8GB",   speed: "SLOW",  color: "#6d28d9", geo: "sphere",        tag: "META",  ok: false, cat: "large"  },
] as const;

const MODEL_COLORS = REPLIT_MODELS.map(m => m.color);

function fmtBytes(b: number): string {
  if (b >= 1e9) return `${(b/1e9).toFixed(1)} GB`;
  if (b >= 1e6) return `${(b/1e6).toFixed(0)} MB`;
  return `${b} B`;
}

/* ══════════════════════════════════════════════════════════════════════
   THREE.JS NEURAL SCENE — hooks
══════════════════════════════════════════════════════════════════════ */
interface SceneState {
  hoveredIdx: number | null;
  selectedIdx: number | null;
}

function buildGeo(type: string): THREE.BufferGeometry {
  switch (type) {
    case "tetrahedron":   return new THREE.TetrahedronGeometry(0.55, 0);
    case "icosahedron":   return new THREE.IcosahedronGeometry(0.5, 1);
    case "dodecahedron":  return new THREE.DodecahedronGeometry(0.5, 0);
    case "octahedron":    return new THREE.OctahedronGeometry(0.55, 0);
    case "torus":         return new THREE.TorusGeometry(0.38, 0.18, 12, 36);
    default:              return new THREE.SphereGeometry(0.48, 24, 24);
  }
}

function useNeuralScene(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  activeModels: string[],
  onHover: (idx: number | null) => void,
  onSelect: (idx: number) => void,
  sceneState: SceneState,
) {
  const rendRef   = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef  = useRef<THREE.Scene | null>(null);
  const camRef    = useRef<THREE.PerspectiveCamera | null>(null);
  const rafRef    = useRef<number>(0);
  const tRef      = useRef(0);
  const mouseRef  = useRef({ x: 0, y: 0, nx: 0, ny: 0 });

  const planetsRef    = useRef<THREE.Mesh[]>([]);
  const glowsRef      = useRef<THREE.Mesh[]>([]);
  const ringsRef      = useRef<THREE.Mesh[]>([]);
  const coreRef       = useRef<THREE.Mesh | null>(null);
  const coreGlowRef   = useRef<THREE.Mesh | null>(null);
  const linesRef      = useRef<THREE.Line | null>(null);
  const particlesRef  = useRef<THREE.Points | null>(null);
  const pPosRef       = useRef<Float32Array>(new Float32Array(0));
  const gridRef       = useRef<THREE.Mesh | null>(null);
  const raycasterRef  = useRef(new THREE.Raycaster());
  const mouseVecRef   = useRef(new THREE.Vector2());
  const hovIdxRef     = useRef<number | null>(null);

  // Planet orbital positions (fixed radii + phase offsets)
  const ORBITS = useMemo(() => REPLIT_MODELS.map((_, i) => ({
    radius: 2.2 + (i % 3) * 0.9,
    tilt:   (Math.PI / 7) * i,
    speed:  (i % 2 === 0 ? 1 : -1) * (0.004 + i * 0.0012),
    phase:  (Math.PI * 2 / 7) * i,
  })), []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = canvas.clientWidth  || 700;
    const H = canvas.clientHeight || 500;

    /* ── Renderer ─────────────────────────────────────── */
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = false;
    rendRef.current = renderer;

    /* ── Scene + Camera ───────────────────────────────── */
    const scene  = new THREE.Scene();
    sceneRef.current = scene;
    const camera = new THREE.PerspectiveCamera(55, W / H, 0.1, 200);
    camera.position.set(0, 1.5, 9);
    camera.lookAt(0, 0, 0);
    camRef.current = camera;

    /* ── Lights ───────────────────────────────────────── */
    scene.add(new THREE.AmbientLight(0x080820, 4));
    const pL1 = new THREE.PointLight(0x7c3aed, 150, 25); pL1.position.set(0, 5, 0); scene.add(pL1);
    const pL2 = new THREE.PointLight(0x00e5ff, 80, 20);  pL2.position.set(-5, -2, 3); scene.add(pL2);
    const pL3 = new THREE.PointLight(0xff2079, 60, 20);  pL3.position.set(5, -2, -3); scene.add(pL3);
    const pL4 = new THREE.PointLight(0x00ff88, 40, 18);  pL4.position.set(0, -4, 5); scene.add(pL4);

    /* ── Core ─────────────────────────────────────────── */
    const coreGeo = new THREE.IcosahedronGeometry(0.72, 3);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x6d28d9, emissive: 0x4c1d95, emissiveIntensity: 3,
      metalness: 0.9, roughness: 0.05, wireframe: false,
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    scene.add(core); coreRef.current = core;

    // Core wireframe overlay
    const wireGeo = new THREE.IcosahedronGeometry(0.74, 1);
    const wireMat = new THREE.MeshBasicMaterial({ color: 0xc4b5fd, wireframe: true, transparent: true, opacity: 0.15 });
    core.add(new THREE.Mesh(wireGeo, wireMat));

    // Core glow halo
    const coreGlowGeo = new THREE.SphereGeometry(1.1, 24, 24);
    const coreGlowMat = new THREE.MeshBasicMaterial({
      color: 0x7c3aed, transparent: true, opacity: 0.06, side: THREE.BackSide,
    });
    const coreGlow = new THREE.Mesh(coreGlowGeo, coreGlowMat);
    scene.add(coreGlow); coreGlowRef.current = coreGlow;

    /* ── 7 Model Planets ──────────────────────────────── */
    planetsRef.current = [];
    glowsRef.current   = [];
    ringsRef.current   = [];
    REPLIT_MODELS.forEach((model, i) => {
      const color  = new THREE.Color(model.color);
      const orbit  = ORBITS[i];

      // Planet body
      const geo = buildGeo(model.geo);
      const mat = new THREE.MeshStandardMaterial({
        color, emissive: color, emissiveIntensity: 0.6,
        metalness: 0.7, roughness: 0.25,
      });
      const planet = new THREE.Mesh(geo, mat);
      planet.userData = { modelIdx: i, orbit, phase: orbit.phase };
      scene.add(planet);
      planetsRef.current.push(planet);

      // Glow sphere (back-face)
      const glowGeo = new THREE.SphereGeometry(0.9, 16, 16);
      const glowMat = new THREE.MeshBasicMaterial({
        color, transparent: true, opacity: 0.07, side: THREE.BackSide,
      });
      const glow = new THREE.Mesh(glowGeo, glowMat);
      planet.add(glow);
      glowsRef.current.push(glow);

      // Orbital ring guide (faint)
      const ringGeo = new THREE.TorusGeometry(orbit.radius, 0.008, 6, 120);
      const ringMat = new THREE.MeshBasicMaterial({
        color, transparent: true, opacity: 0.12,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = orbit.tilt;
      scene.add(ring);
      ringsRef.current.push(ring);
    });

    /* ── Neural Connection Lines ──────────────────────── */
    const linePositions = new Float32Array(REPLIT_MODELS.length * 6); // placeholder
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute("position", new THREE.BufferAttribute(linePositions, 3));
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x7c3aed, transparent: true, opacity: 0.18, linewidth: 1,
    });
    const lines = new THREE.LineSegments(lineGeo, lineMat);
    scene.add(lines); linesRef.current = lines;

    /* ── Particle Field ───────────────────────────────── */
    const pCount = 1200;
    const pPos   = new Float32Array(pCount * 3);
    const pCol   = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount; i++) {
      pPos[i*3]   = (Math.random() - 0.5) * 24;
      pPos[i*3+1] = (Math.random() - 0.5) * 18;
      pPos[i*3+2] = (Math.random() - 0.5) * 16;
      const c = new THREE.Color(MODEL_COLORS[i % MODEL_COLORS.length]);
      pCol[i*3] = c.r; pCol[i*3+1] = c.g; pCol[i*3+2] = c.b;
    }
    pPosRef.current = pPos;
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
    pGeo.setAttribute("color",    new THREE.BufferAttribute(pCol, 3));
    const pMat = new THREE.PointsMaterial({ size: 0.035, vertexColors: true, transparent: true, opacity: 0.5 });
    const particles = new THREE.Points(pGeo, pMat);
    scene.add(particles); particlesRef.current = particles;

    /* ── Hex Grid Plane ───────────────────────────────── */
    const gridGeo = new THREE.PlaneGeometry(30, 30, 40, 40);
    const gridMat = new THREE.MeshBasicMaterial({
      color: 0x2d1b69, wireframe: true, transparent: true, opacity: 0.12,
    });
    const grid = new THREE.Mesh(gridGeo, gridMat);
    grid.rotation.x = -Math.PI / 2;
    grid.position.y = -4.5;
    scene.add(grid); gridRef.current = grid;

    /* ── Animation Loop ───────────────────────────────── */
    let lastTime = performance.now();
    function animate() {
      rafRef.current = requestAnimationFrame(animate);
      const now  = performance.now();
      const dt   = Math.min((now - lastTime) / 1000, 0.033);
      lastTime   = now;
      tRef.current += dt;
      const t = tRef.current;

      /* Core pulse */
      if (coreRef.current) {
        coreRef.current.rotation.x = t * 0.22;
        coreRef.current.rotation.y = t * 0.37;
        const s = 1 + Math.sin(t * 1.8) * 0.04;
        coreRef.current.scale.setScalar(s);
        const mat = coreRef.current.material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = 2.5 + Math.sin(t * 2.5) * 0.8;
      }
      if (coreGlowRef.current) {
        const m = coreGlowRef.current.material as THREE.MeshBasicMaterial;
        m.opacity = 0.04 + Math.sin(t * 2) * 0.03;
      }

      /* Planet orbits + self-rotation */
      const linePos = new Float32Array(REPLIT_MODELS.length * (REPLIT_MODELS.length - 1) * 6);
      let li = 0;
      planetsRef.current.forEach((planet, i) => {
        const orbit = ORBITS[i];
        const angle = orbit.phase + t * orbit.speed * 60;
        // Calculate position in tilted orbit plane
        const localX = Math.cos(angle) * orbit.radius;
        const localZ = Math.sin(angle) * orbit.radius;
        // Apply tilt
        const cosT = Math.cos(orbit.tilt), sinT = Math.sin(orbit.tilt);
        planet.position.set(localX, localZ * sinT, localZ * cosT);
        planet.rotation.x += dt * (0.3 + i * 0.1);
        planet.rotation.y += dt * (0.2 + i * 0.07);

        const isHov = hovIdxRef.current === i;
        const isAct = activeModels.includes(REPLIT_MODELS[i].name);
        const mat   = planet.material as THREE.MeshStandardMaterial;
        const glow  = glowsRef.current[i].material as THREE.MeshBasicMaterial;

        if (isHov) {
          mat.emissiveIntensity = 2.5 + Math.sin(t * 6) * 0.5;
          glow.opacity = 0.22;
          planet.scale.setScalar(1.25 + Math.sin(t * 5) * 0.05);
        } else if (isAct) {
          mat.emissiveIntensity = 1.2 + Math.sin(t * 3 + i) * 0.3;
          glow.opacity = 0.12;
          planet.scale.setScalar(1.08 + Math.sin(t * 2.5 + i) * 0.04);
        } else {
          mat.emissiveIntensity = 0.3 + Math.sin(t * 1.5 + i * 0.5) * 0.1;
          glow.opacity = 0.04;
          planet.scale.setScalar(0.85);
        }
        mat.needsUpdate = true;
      });

      /* Update connection lines (core ↔ active planets) */
      const cPos = coreRef.current?.position ?? new THREE.Vector3();
      planetsRef.current.forEach((planet, i) => {
        if (activeModels.includes(REPLIT_MODELS[i].name)) {
          const p = planet.position;
          linePos[li++] = cPos.x; linePos[li++] = cPos.y; linePos[li++] = cPos.z;
          linePos[li++] = p.x;    linePos[li++] = p.y;    linePos[li++] = p.z;
        }
      });
      if (linesRef.current) {
        const attr = linesRef.current.geometry.attributes.position as THREE.BufferAttribute;
        for (let k = 0; k < linePos.length; k++) (attr.array as Float32Array)[k] = linePos[k];
        linesRef.current.geometry.setDrawRange(0, li / 3);
        attr.needsUpdate = true;
        (linesRef.current.material as THREE.LineBasicMaterial).opacity =
          0.12 + Math.sin(t * 2) * 0.06;
      }

      /* Particles drift */
      if (particlesRef.current) {
        particlesRef.current.rotation.y  = t * 0.018;
        particlesRef.current.rotation.x  = Math.sin(t * 0.05) * 0.06;
        const pos = pPosRef.current;
        for (let i = 0; i < pos.length / 3; i++) {
          pos[i*3+1] += dt * 0.08;
          if (pos[i*3+1] > 9) pos[i*3+1] = -9;
        }
        (particlesRef.current.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      }

      /* Grid pulse */
      if (gridRef.current) {
        (gridRef.current.material as THREE.MeshBasicMaterial).opacity =
          0.08 + Math.sin(t * 0.8) * 0.04;
      }

      /* Camera smooth mouse parallax */
      const mx = mouseRef.current.nx * 1.2;
      const my = mouseRef.current.ny * 0.7;
      camera.position.x += (mx - camera.position.x) * 0.04;
      camera.position.y += (my + 1.5 - camera.position.y) * 0.04;
      camera.lookAt(0, 0, 0);

      /* Raycasting for hover */
      raycasterRef.current.setFromCamera(mouseVecRef.current, camera);
      const hits = raycasterRef.current.intersectObjects(planetsRef.current, false);
      const newHov = hits.length > 0 ? (hits[0].object.userData.modelIdx as number) : null;
      if (newHov !== hovIdxRef.current) {
        hovIdxRef.current = newHov;
        onHover(newHov);
      }

      renderer.render(scene, camera);
    }
    animate();

    /* ── Mouse tracking ───────────────────────────────── */
    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x  = e.clientX - rect.left;
      mouseRef.current.y  = e.clientY - rect.top;
      mouseRef.current.nx = ((e.clientX - rect.left) / rect.width  - 0.5) * 2;
      mouseRef.current.ny = -((e.clientY - rect.top)  / rect.height - 0.5) * 2;
      mouseVecRef.current.set(
        (e.clientX - rect.left) / rect.width  * 2 - 1,
        -((e.clientY - rect.top)  / rect.height) * 2 + 1,
      );
    };
    const onClick = () => {
      if (hovIdxRef.current !== null) onSelect(hovIdxRef.current);
    };
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("click", onClick);

    /* ── Resize ───────────────────────────────────────── */
    const onResize = () => {
      const W2 = canvas.clientWidth, H2 = canvas.clientHeight;
      if (!W2 || !H2) return;
      camera.aspect = W2 / H2;
      camera.updateProjectionMatrix();
      renderer.setSize(W2, H2);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(rafRef.current);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("click", onClick);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update active model visuals reactively
  useEffect(() => {
    // Orbital ring opacity by active state
    ringsRef.current.forEach((ring, i) => {
      const mat = ring.material as THREE.MeshBasicMaterial;
      mat.opacity = activeModels.includes(REPLIT_MODELS[i].name) ? 0.35 : 0.1;
      mat.needsUpdate = true;
    });
  }, [activeModels]);
}

/* ── Benchmark types ────────────────────────────────────────────────── */
interface BenchRun { tps: number; ttft: number; totalMs: number; tokens: number; }
interface BenchModelResult {
  name: string; runs: BenchRun[];
  avgTps: number; avgTtft: number; minTps: number; maxTps: number;
}

/* ══════════════════════════════════════════════════════════════════════
   COMPARE RACE CANVAS — Live 3D-style racing bar with particle trail
══════════════════════════════════════════════════════════════════════ */
function CompareRaceCanvas({
  tpsA, tpsB, tokensA, tokensB, loadA, loadB, doneA, doneB, ttftA, ttftB,
}: {
  tpsA: number; tpsB: number; tokensA: number; tokensB: number;
  loadA: boolean; loadB: boolean; doneA: boolean; doneB: boolean;
  ttftA: number | null; ttftB: number | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef(0);
  const tRef      = useRef(0);

  const tpsARef    = useRef(tpsA);
  const tpsBRef    = useRef(tpsB);
  const tokARef    = useRef(tokensA);
  const tokBRef    = useRef(tokensB);
  const doneARef   = useRef(doneA);
  const doneBRef   = useRef(doneB);
  const histARef   = useRef<number[]>(Array(50).fill(0));
  const histBRef   = useRef<number[]>(Array(50).fill(0));
  const sparksRef  = useRef<{ x:number; y:number; vx:number; vy:number; life:number; color:string }[]>([]);
  const lastTickRef= useRef(0);

  useEffect(() => { tpsARef.current = tpsA; }, [tpsA]);
  useEffect(() => { tpsBRef.current = tpsB; }, [tpsB]);
  useEffect(() => { tokARef.current = tokensA; }, [tokensA]);
  useEffect(() => { tokBRef.current = tokensB; }, [tokensB]);
  useEffect(() => { doneARef.current = doneA; }, [doneA]);
  useEffect(() => { doneBRef.current = doneB; }, [doneB]);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const W = 560, H = 200;
    const DPR = Math.min(window.devicePixelRatio * 2, 4);
    cv.width  = W * DPR;
    cv.height = H * DPR;
    const ctx = cv.getContext("2d", { alpha: true })!;
    ctx.scale(DPR, DPR);

    const COL_A = "#f43f5e", COL_B = "#a78bfa";
    const BAR_Y_A = 68, BAR_Y_B = 118, BAR_H = 28;
    const BAR_X0 = 64, BAR_MAX_W = W - 80;

    const draw = (ts: number) => {
      tRef.current = ts * 0.001;
      const t = tRef.current;
      ctx.clearRect(0, 0, W, H);

      /* ── Background grid ── */
      ctx.strokeStyle = "rgba(255,255,255,0.025)";
      ctx.lineWidth   = 0.5;
      for (let x = BAR_X0; x < W - 16; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 30); ctx.lineTo(x, H - 30); ctx.stroke();
      }

      /* Update history ~200ms */
      if (ts - lastTickRef.current > 200) {
        histARef.current.push(tpsARef.current);
        histBRef.current.push(tpsBRef.current);
        if (histARef.current.length > 50) histARef.current.shift();
        if (histBRef.current.length > 50) histBRef.current.shift();
        lastTickRef.current = ts;
        /* Sparks on new tokens */
        if (tpsARef.current > 0) {
          for (let i = 0; i < 3; i++) sparksRef.current.push({
            x: BAR_X0 + Math.min(tpsARef.current / Math.max(tpsBRef.current, tpsARef.current, 1), 1) * BAR_MAX_W,
            y: BAR_Y_A + BAR_H / 2, vx: (Math.random() + 0.5) * 2.5, vy: (Math.random() - 0.5) * 2,
            life: 1, color: COL_A,
          });
        }
        if (tpsBRef.current > 0) {
          for (let i = 0; i < 3; i++) sparksRef.current.push({
            x: BAR_X0 + Math.min(tpsBRef.current / Math.max(tpsBRef.current, tpsARef.current, 1), 1) * BAR_MAX_W,
            y: BAR_Y_B + BAR_H / 2, vx: (Math.random() + 0.5) * 2.5, vy: (Math.random() - 0.5) * 2,
            life: 1, color: COL_B,
          });
        }
      }

      const maxTps = Math.max(tpsARef.current, tpsBRef.current, 1);

      /* Draw bars */
      [[COL_A, tpsARef.current, BAR_Y_A, histARef.current, "MODEL A"] as const,
       [COL_B, tpsBRef.current, BAR_Y_B, histBRef.current, "MODEL B"] as const
      ].forEach(([col, tps, barY, hist, label]) => {
        const frac = tps / maxTps;
        const bw   = BAR_MAX_W * frac;

        /* Track */
        ctx.fillStyle = "rgba(255,255,255,0.03)";
        ctx.beginPath();
        ctx.roundRect(BAR_X0, barY, BAR_MAX_W, BAR_H, 6);
        ctx.fill();

        /* Bar with gradient */
        if (bw > 0) {
          const grad = ctx.createLinearGradient(BAR_X0, 0, BAR_X0 + bw, 0);
          grad.addColorStop(0,   `${col}50`);
          grad.addColorStop(0.6, `${col}cc`);
          grad.addColorStop(1,   col);
          ctx.fillStyle = grad;
          ctx.shadowColor = col; ctx.shadowBlur = 14;
          ctx.beginPath();
          ctx.roundRect(BAR_X0, barY, bw, BAR_H, 6);
          ctx.fill();
          ctx.shadowBlur = 0;

          /* Animated sheen */
          const sheenX = ((t * 60 + (col === COL_A ? 0 : 100)) % (bw + 40)) - 20;
          const sheenGrad = ctx.createLinearGradient(BAR_X0 + sheenX - 10, 0, BAR_X0 + sheenX + 10, 0);
          sheenGrad.addColorStop(0,   "rgba(255,255,255,0)");
          sheenGrad.addColorStop(0.5, "rgba(255,255,255,0.18)");
          sheenGrad.addColorStop(1,   "rgba(255,255,255,0)");
          ctx.fillStyle = sheenGrad;
          ctx.beginPath();
          ctx.roundRect(BAR_X0, barY, bw, BAR_H, 6);
          ctx.fill();
        }

        /* Micro-history waveform overlay */
        const maxH2 = Math.max(...hist, 1);
        ctx.globalAlpha = 0.35;
        ctx.strokeStyle = col;
        ctx.lineWidth   = 1;
        ctx.beginPath();
        hist.forEach((v, i) => {
          const x = BAR_X0 + (i / hist.length) * BAR_MAX_W;
          const y = barY + BAR_H - (v / maxH2) * BAR_H * 0.8;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.stroke();
        ctx.globalAlpha = 1;

        /* Label */
        ctx.font      = "bold 8px monospace";
        ctx.fillStyle = `${col}80`;
        ctx.textAlign = "left";
        ctx.fillText(label, BAR_X0, barY - 5);

        /* TPS value */
        ctx.font      = `bold ${tps >= 100 ? "13" : "15"}px monospace`;
        ctx.fillStyle = col;
        ctx.textAlign = "right";
        ctx.shadowColor = col; ctx.shadowBlur = 10;
        ctx.fillText(`${tps} t/s`, BAR_X0 - 4, barY + BAR_H / 2 + 5);
        ctx.shadowBlur = 0;
      });

      /* ── VS divider ── */
      ctx.textAlign   = "center";
      ctx.font        = "bold 10px monospace";
      ctx.fillStyle   = `rgba(255,255,255,${0.5 + 0.2 * Math.sin(t * 3)})`;
      ctx.shadowColor = "white"; ctx.shadowBlur = 8;
      ctx.fillText("VS", W / 2, H / 2 + 2);
      ctx.shadowBlur  = 0;

      /* Token counts */
      ctx.font      = "8px monospace";
      ctx.fillStyle = `${COL_A}70`;
      ctx.textAlign = "left";
      ctx.fillText(`${tokARef.current} tokens`, BAR_X0, BAR_Y_A + BAR_H + 12);
      ctx.fillStyle = `${COL_B}70`;
      ctx.fillText(`${tokBRef.current} tokens`, BAR_X0, BAR_Y_B + BAR_H + 12);

      /* ── Finish line ── */
      if (doneARef.current || doneBRef.current) {
        ctx.strokeStyle = "rgba(255,255,255,0.15)";
        ctx.lineWidth   = 1;
        ctx.setLineDash([3, 5]);
        ctx.beginPath();
        ctx.moveTo(BAR_X0 + BAR_MAX_W - 1, 30);
        ctx.lineTo(BAR_X0 + BAR_MAX_W - 1, H - 30);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.font      = "bold 7px monospace";
        ctx.fillStyle = "rgba(255,255,255,0.3)";
        ctx.textAlign = "right";
        ctx.fillText("DONE", W - 4, 40);
      }

      /* ── Sparks ── */
      sparksRef.current = sparksRef.current.filter(s => s.life > 0.02);
      sparksRef.current.forEach(s => {
        s.x += s.vx; s.y += s.vy; s.vy += 0.05; s.life *= 0.84;
        ctx.globalAlpha = s.life;
        ctx.fillStyle   = s.color;
        ctx.shadowColor = s.color; ctx.shadowBlur = 4;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.life * 1.8, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur  = 0;
        ctx.globalAlpha = 1;
      });

      /* ── Animated border ── */
      const borderAlpha = 0.2 + 0.12 * Math.sin(t * 2);
      const borderGrad  = ctx.createLinearGradient(0, 0, W, 0);
      borderGrad.addColorStop(0,   `rgba(244,63,94,${borderAlpha})`);
      borderGrad.addColorStop(0.5, `rgba(255,255,255,${borderAlpha * 0.4})`);
      borderGrad.addColorStop(1,   `rgba(167,139,250,${borderAlpha})`);
      ctx.strokeStyle = borderGrad;
      ctx.lineWidth   = 0.8;
      ctx.strokeRect(0.5, 0.5, W - 1, H - 1);

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: "100%", height: 200, display: "block", borderRadius: 14 }}
    />
  );
}

/* ══════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════════ */
type Tab = "dashboard" | "library" | "chat" | "hf" | "groq" | "bench" | "compare" | "history";

export function OllamaHub3D({ open, onClose }: OllamaHubProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [tab,        setTab]        = useState<Tab>("dashboard");
  const [status,     setStatus]     = useState<OllamaStatus>({ running: false, models: [], version: null });
  const [running,    setRunning]    = useState<RunningModel[]>([]);
  const [pulling,    setPulling]    = useState<Record<string, number>>({});
  const [pullLog,    setPullLog]    = useState<Record<string, string>>({});
  const [installing, setInstalling] = useState(false);
  const [installLog, setInstallLog] = useState<string[]>([]);
  const [hoveredModel, setHoveredModel] = useState<number | null>(null);
  const [selectedModel, setSelectedModel] = useState<number | null>(null);

  /* Chat state */
  const [chatModel,   setChatModel]   = useState("");
  const [chatInput,   setChatInput]   = useState("");
  const [chatHistory, setChatHistory] = useState<Array<{ role: string; content: string }>>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [streamBuf,   setStreamBuf]   = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  /* HF Spaces */
  const [hfUrl, setHfUrl] = useState(() => localStorage.getItem("ollama-hf-url") || "");
  const [hfKey, setHfKey] = useState(() => localStorage.getItem("ollama-hf-key") || "");

  /* Background download tracker */
  const [dlStatus, setDlStatus] = useState<{ done: boolean; binExists: boolean; log: string }>({ done: false, binExists: false, log: "" });

  /* ── Feature 3: System stats (RAM / Disk) ────────────── */
  const [sysInfo, setSysInfo] = useState<{
    totalRam: number; freeRam: number; usedRam: number;
    diskUsed: number; diskTotal: number; modelsDirSize: number;
    runningModels: unknown[];
  } | null>(null);

  /* ── Feature 8: Test connection ──────────────────────── */
  const [testConn, setTestConn] = useState<{ testing: boolean; ok: boolean | null; latencyMs: number | null; modelCount: number | null; error?: string }>({ testing: false, ok: null, latencyMs: null, modelCount: null });

  /* ── Feature 1 & 2: Groq provider ────────────────────── */
  const [groqKey,       setGroqKey]       = useState(() => localStorage.getItem("mr7-ai-p-key-groq") || "");
  const [groqKeyInput,  setGroqKeyInput]  = useState(() => localStorage.getItem("mr7-ai-p-key-groq") || "");
  const [groqSaved,     setGroqSaved]     = useState(false);
  const [groqTestRes,   setGroqTestRes]   = useState<{ ok: boolean; ms: number } | null>(null);
  const [groqTesting,   setGroqTesting]   = useState(false);

  /* ── Feature 7: Benchmark ────────────────────────────── */
  const [benchPrompt,   setBenchPrompt]   = useState("Explain neural networks in 2 sentences.");
  const [benchRuns,     setBenchRuns]     = useState(3);
  const [benchModels,   setBenchModels]   = useState<string[]>([]);
  const [benchResults,  setBenchResults]  = useState<BenchModelResult[]>([]);
  const [benchRunning,  setBenchRunning]  = useState(false);
  const [benchProgress, setBenchProgress] = useState("");

  /* ── Feature 9: Side-by-side compare ────────────────── */
  const [cmpModelA,  setCmpModelA]  = useState("");
  const [cmpModelB,  setCmpModelB]  = useState("");
  const [cmpPrompt,  setCmpPrompt]  = useState("What is quantum computing?");
  const [cmpResA,    setCmpResA]    = useState("");
  const [cmpResB,    setCmpResB]    = useState("");
  const [cmpLoadA,   setCmpLoadA]   = useState(false);
  const [cmpLoadB,   setCmpLoadB]   = useState(false);
  const [cmpCopied,  setCmpCopied]  = useState<"A"|"B"|null>(null);

  /* ── Custom model pull ───────────────────────────────── */
  const [customModelName, setCustomModelName] = useState("");
  const [customPulling,   setCustomPulling]   = useState(false);

  /* ── Auto-pull queue ─────────────────────────────────── */
  const [autoPullActive,  setAutoPullActive]  = useState(false);
  const [autoPullQueue,   setAutoPullQueue]   = useState<string[]>([]);
  const [autoPullCurrent, setAutoPullCurrent] = useState<string | null>(null);
  const [autoPullDone,    setAutoPullDone]    = useState<string[]>([]);
  const autoPullAbort = useRef(false);

  /* ── Cleanup (stuck blobs) ───────────────────────────── */
  const [cleanupFiles,   setCleanupFiles]   = useState<{ name: string; size: number }[]>([]);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [cleanupDone,    setCleanupDone]    = useState(false);

  /* ── Compare real-time metrics ───────────────────────── */
  const [cmpTpsA,    setCmpTpsA]    = useState(0);
  const [cmpTpsB,    setCmpTpsB]    = useState(0);
  const [cmpTokensA, setCmpTokensA] = useState(0);
  const [cmpTokensB, setCmpTokensB] = useState(0);
  const [cmpTtftA,   setCmpTtftA]   = useState<number | null>(null);
  const [cmpTtftB,   setCmpTtftB]   = useState<number | null>(null);
  const [cmpDoneA,   setCmpDoneA]   = useState(false);
  const [cmpDoneB,   setCmpDoneB]   = useState(false);
  const [cmpElapsedA, setCmpElapsedA] = useState(0);
  const [cmpElapsedB, setCmpElapsedB] = useState(0);
  const [cmpWinner,  setCmpWinner]  = useState<"A" | "B" | "tie" | null>(null);

  const activeModels = useMemo(
    () => status.models.map(m => m.name),
    [status.models],
  );

  const sceneState = useMemo<SceneState>(
    () => ({ hoveredIdx: hoveredModel, selectedIdx: selectedModel }),
    [hoveredModel, selectedModel],
  );

  const handleHover  = useCallback((idx: number | null) => setHoveredModel(idx), []);
  const handleSelect = useCallback((idx: number) => {
    setSelectedModel(idx);
    setChatModel(REPLIT_MODELS[idx].name);
    setTab("chat");
  }, []);

  useNeuralScene(canvasRef, activeModels, handleHover, handleSelect, sceneState);

  /* ── Data Fetching ──────────────────────────────────── */
  const fetchStatus = useCallback(async () => {
    try {
      const r  = await fetch("/api/ollama/status");
      const d  = await r.json() as OllamaStatus;
      setStatus(d);
      if (d.running) {
        const ps = await fetch("/api/ollama/ps");
        const pd = await ps.json() as { models?: RunningModel[] };
        setRunning(pd.models ?? []);
        if (d.models[0] && !chatModel) setChatModel(d.models[0].name);
      }
    } catch { /* offline */ }
  }, [chatModel]);

  const fetchDlStatus = useCallback(async () => {
    try {
      const r = await fetch("/api/ollama/dl-status");
      const d = await r.json() as typeof dlStatus;
      setDlStatus(d);
    } catch { /* skip */ }
  }, []);

  /* ── Feature 3: Fetch system RAM/Disk stats ──────────── */
  const fetchSysInfo = useCallback(async () => {
    try {
      const r = await fetch("/api/ollama/sysinfo");
      if (r.ok) setSysInfo(await r.json());
    } catch { /* skip */ }
  }, []);

  /* ── Cleanup: scan & delete stuck partial downloads ─── */
  const handleScanCleanup = useCallback(async () => {
    setCleanupLoading(true);
    setCleanupDone(false);
    try {
      const r = await fetch("/api/ollama/cleanup-blobs");
      const d = await r.json() as { files: { name: string; size: number }[] };
      setCleanupFiles(d.files ?? []);
    } catch { setCleanupFiles([]); }
    finally { setCleanupLoading(false); }
  }, []);

  const handleDoCleanup = useCallback(async () => {
    setCleanupLoading(true);
    try {
      await fetch("/api/ollama/cleanup-blobs", { method: "DELETE" });
      setCleanupFiles([]);
      setCleanupDone(true);
      await fetchSysInfo();
    } catch { /* skip */ }
    finally { setCleanupLoading(false); }
  }, [fetchSysInfo]);

  /* ── Feature 8: Test Ollama connection ───────────────── */
  const handleTestConnection = useCallback(async () => {
    setTestConn(s => ({ ...s, testing: true, ok: null }));
    try {
      const r = await fetch("/api/ollama/test-connection");
      const d = await r.json() as { ok: boolean; latencyMs: number; modelCount: number; version: string; error?: string };
      setTestConn({ testing: false, ok: d.ok, latencyMs: d.latencyMs, modelCount: d.modelCount, error: d.error });
    } catch (e) {
      setTestConn({ testing: false, ok: false, latencyMs: null, modelCount: null, error: String(e) });
    }
  }, []);

  /* ── Feature 1: Save Groq API key ─────────────────────── */
  const handleSaveGroqKey = useCallback(() => {
    localStorage.setItem("mr7-ai-p-key-groq", groqKeyInput);
    setGroqKey(groqKeyInput);
    setGroqSaved(true);
    setTimeout(() => setGroqSaved(false), 2500);
  }, [groqKeyInput]);

  /* ── Feature 1: Test Groq connection ─────────────────── */
  const handleTestGroq = useCallback(async () => {
    if (!groqKeyInput.trim()) return;
    setGroqTesting(true);
    setGroqTestRes(null);
    const t0 = Date.now();
    try {
      const r = await fetch("https://api.groq.com/openai/v1/models", {
        headers: { Authorization: `Bearer ${groqKeyInput}` },
        signal: AbortSignal.timeout(8000),
      });
      setGroqTestRes({ ok: r.ok, ms: Date.now() - t0 });
    } catch {
      setGroqTestRes({ ok: false, ms: Date.now() - t0 });
    } finally { setGroqTesting(false); }
  }, [groqKeyInput]);

  /* ── Feature 7: Statistical benchmark ───────────────── */
  const handleBenchmark = useCallback(async () => {
    if (!status.running || benchModels.length === 0) return;
    setBenchRunning(true);
    setBenchResults([]);
    const modelsCopy = [...benchModels];
    const results: BenchModelResult[] = [];

    for (const modelName of modelsCopy) {
      const runs: { tps: number; ttft: number; totalMs: number; tokens: number }[] = [];
      for (let i = 0; i < benchRuns; i++) {
        setBenchProgress(`${modelName} — run ${i + 1}/${benchRuns}`);
        const t0 = Date.now();
        let ttft = 0;
        let tokenCount = 0;
        let firstToken = true;
        try {
          const r = await fetch("/api/ollama/chat/stream", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ model: modelName, messages: [{ role: "user", content: benchPrompt }] }),
            signal: AbortSignal.timeout(60_000),
          });
          if (!r.body) throw new Error("no body");
          const reader = r.body.getReader();
          const dec = new TextDecoder();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            for (const line of dec.decode(value).split("\n").filter(l => l.startsWith("data:"))) {
              try {
                const d = JSON.parse(line.slice(5));
                if (d.message?.content) {
                  tokenCount += d.message.content.split(/\s+/).length;
                  if (firstToken) { ttft = Date.now() - t0; firstToken = false; }
                }
              } catch { /* skip */ }
            }
          }
        } catch { /* skip */ }
        const totalMs = Date.now() - t0;
        const tps = totalMs > 0 ? Math.round((tokenCount / totalMs) * 1000) : 0;
        runs.push({ tps, ttft, totalMs, tokens: tokenCount });
      }
      const avgTps  = runs.reduce((s, r) => s + r.tps, 0) / (runs.length || 1);
      const avgTtft = runs.reduce((s, r) => s + r.ttft, 0) / (runs.length || 1);
      const minTps  = Math.min(...runs.map(r => r.tps));
      const maxTps  = Math.max(...runs.map(r => r.tps));
      results.push({ name: modelName, runs, avgTps: Math.round(avgTps), avgTtft: Math.round(avgTtft), minTps, maxTps });
      setBenchResults([...results]);
    }
    setBenchProgress("");
    setBenchRunning(false);
    // ── Save to history ──────────────────────────────────────────
    if (results.length > 0) {
      saveBenchEntry({
        ts: Date.now(),
        prompt: benchPrompt,
        results: results.map(r => ({
          name:    r.name,
          avgTps:  r.avgTps,
          avgTtft: r.avgTtft,
          minTps:  r.minTps,
          maxTps:  r.maxTps,
        })),
      });
    }
  }, [status.running, benchModels, benchRuns, benchPrompt]);

  /* ── Feature 9: Side-by-side compare — parallel with live TPS ─── */
  const handleCompare = useCallback(async () => {
    if (!status.running || (!cmpModelA && !cmpModelB)) return;
    setCmpResA(""); setCmpResB("");
    setCmpTpsA(0); setCmpTpsB(0);
    setCmpTokensA(0); setCmpTokensB(0);
    setCmpTtftA(null); setCmpTtftB(null);
    setCmpDoneA(false); setCmpDoneB(false);
    setCmpElapsedA(0); setCmpElapsedB(0);
    setCmpWinner(null);

    const runModel = async (
      model: string,
      setRes: (v: string) => void,
      setLoad: (v: boolean) => void,
      setTps: (v: number) => void,
      setTokens: (v: number) => void,
      setTtft: (v: number) => void,
      setDone: (v: boolean) => void,
      setElapsed: (v: number) => void,
    ): Promise<{ finalTps: number; totalTokens: number; totalMs: number }> => {
      if (!model) return { finalTps: 0, totalTokens: 0, totalMs: 0 };
      setLoad(true);
      let buf = "", tokenCount = 0, firstToken = true, ttft = 0;
      const t0 = Date.now();
      const tpsWin: { ts: number; tokens: number }[] = [];

      const elapsedIv = setInterval(() => setElapsed(Date.now() - t0), 100);

      try {
        const r = await fetch("/api/ollama/chat/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model, messages: [{ role: "user", content: cmpPrompt }] }),
          signal: AbortSignal.timeout(90_000),
        });
        if (!r.body) throw new Error("no body");
        const reader = r.body.getReader();
        const dec    = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          for (const line of dec.decode(value).split("\n").filter(l => l.startsWith("data:"))) {
            try {
              const d = JSON.parse(line.slice(5));
              if (d.message?.content) {
                const words = d.message.content.split(/\s+/).filter(Boolean).length || 1;
                tokenCount += words;
                buf        += d.message.content;
                setRes(buf);
                setTokens(tokenCount);

                if (firstToken) { ttft = Date.now() - t0; setTtft(ttft); firstToken = false; }

                const now = Date.now();
                tpsWin.push({ ts: now, tokens: words });
                const cut = now - 3000;
                while (tpsWin.length > 0 && tpsWin[0].ts < cut) tpsWin.shift();
                const totTok = tpsWin.reduce((s, e) => s + e.tokens, 0);
                const spanMs = tpsWin.length > 1 ? tpsWin[tpsWin.length - 1].ts - tpsWin[0].ts : 1000;
                setTps(Math.round((totTok / spanMs) * 1000));
              }
            } catch { /* skip */ }
          }
        }
      } catch { /* skip */ }
      finally {
        clearInterval(elapsedIv);
        setLoad(false);
        setDone(true);
      }
      const totalMs = Date.now() - t0;
      const finalTps = tokenCount > 0 && totalMs > 0 ? Math.round((tokenCount / totalMs) * 1000) : 0;
      return { finalTps, totalTokens: tokenCount, totalMs };
    };

    const [resA, resB] = await Promise.all([
      runModel(cmpModelA, setCmpResA, setCmpLoadA, setCmpTpsA, setCmpTokensA, v => setCmpTtftA(v), setCmpDoneA, setCmpElapsedA),
      runModel(cmpModelB, setCmpResB, setCmpLoadB, setCmpTpsB, setCmpTokensB, v => setCmpTtftB(v), setCmpDoneB, setCmpElapsedB),
    ]);

    if (resA.finalTps > resB.finalTps + 2)      setCmpWinner("A");
    else if (resB.finalTps > resA.finalTps + 2)  setCmpWinner("B");
    else                                          setCmpWinner("tie");
  }, [status.running, cmpModelA, cmpModelB, cmpPrompt]);

  useEffect(() => {
    if (!open) return;
    fetchStatus();
    fetchDlStatus();
    fetchSysInfo();
    const iv1 = setInterval(fetchStatus,   10_000);
    const iv2 = setInterval(fetchDlStatus, 5_000);
    const iv3 = setInterval(fetchSysInfo,  15_000);
    return () => { clearInterval(iv1); clearInterval(iv2); clearInterval(iv3); };
  }, [open, fetchStatus, fetchDlStatus, fetchSysInfo]);

  /* ── Auto-scroll chat ───────────────────────────────── */
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, streamBuf]);

  /* ── Install Handler ────────────────────────────────── */
  const handleInstall = async () => {
    setInstalling(true);
    setInstallLog([]);
    setTab("dashboard");
    try {
      const r = await fetch("/api/ollama/install", { method: "POST" });
      if (!r.body) return;
      const reader  = r.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value).split("\n").filter(l => l.startsWith("data:"))) {
          try {
            const d = JSON.parse(line.slice(5));
            if (d.msg)  setInstallLog(p => [...p.slice(-20), d.msg]);
            if (d.done) { await fetchStatus(); }
          } catch { /* skip */ }
        }
      }
    } finally { setInstalling(false); }
  };

  /* ── Pull Model Handler ─────────────────────────────── */
  const handlePull = async (modelName: string) => {
    if (!status.running) return;
    setPulling(p => ({ ...p, [modelName]: 0 }));
    setPullLog(p  => ({ ...p, [modelName]: "Connecting..." }));
    try {
      const r = await fetch("/api/ollama/pull", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: modelName }),
      });
      if (!r.body) return;
      const reader  = r.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value).split("\n").filter(l => l.startsWith("data:"))) {
          try {
            const d = JSON.parse(line.slice(5));
            if (d.total && d.completed) setPulling(p => ({ ...p, [modelName]: Math.round(d.completed / d.total * 100) }));
            if (d.status) setPullLog(p => ({ ...p, [modelName]: d.status }));
            if (d.done)   await fetchStatus();
          } catch { /* skip */ }
        }
      }
    } finally {
      setPulling(p => { const n = { ...p }; delete n[modelName]; return n; });
      await fetchStatus();
    }
  };

  /* ── Custom model pull (any model name the user types) ── */
  const handleCustomPull = useCallback(async () => {
    const name = customModelName.trim();
    if (!name || !status.running) return;
    setCustomPulling(true);
    await handlePull(name);
    setCustomModelName("");
    setCustomPulling(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customModelName, status.running]);

  /* ── Auto-pull all recommended models sequentially ──── */
  const handleAutoPullAll = useCallback(async () => {
    if (!status.running) return;
    const installed = new Set(status.models.map(m => m.name));
    const queue = REPLIT_MODELS.filter(m => m.ok && !installed.has(m.name)).map(m => m.name);
    if (queue.length === 0) return;

    setAutoPullActive(true);
    setAutoPullQueue([...queue]);
    setAutoPullDone([]);
    autoPullAbort.current = false;

    for (const modelName of queue) {
      if (autoPullAbort.current) break;
      setAutoPullCurrent(modelName);
      setAutoPullQueue(prev => prev.filter(n => n !== modelName));
      await handlePull(modelName);
      setAutoPullDone(prev => [...prev, modelName]);
      await fetchStatus();
    }

    setAutoPullCurrent(null);
    setAutoPullActive(false);
    autoPullAbort.current = false;
  }, [status.running, status.models, handlePull, fetchStatus]);

  const stopAutoPull = useCallback(() => {
    autoPullAbort.current = true;
    setAutoPullActive(false);
    setAutoPullCurrent(null);
    setAutoPullQueue([]);
  }, []);

  const handleDelete = async (name: string) => {
    await fetch("/api/ollama/delete", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: name }),
    });
    await fetchStatus();
  };

  /* ── Streaming Chat ─────────────────────────────────── */
  const handleChat = async () => {
    if (!chatInput.trim() || !chatModel || chatLoading) return;
    const msg = chatInput.trim();
    setChatInput("");
    const newHistory = [...chatHistory, { role: "user", content: msg }];
    setChatHistory(newHistory);
    setChatLoading(true);
    setStreamBuf("");
    let buf = "";
    try {
      const r = await fetch("/api/ollama/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: chatModel, messages: newHistory }),
      });
      if (!r.body) throw new Error("no stream");
      const reader  = r.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value).split("\n").filter(l => l.startsWith("data:"))) {
          try {
            const d = JSON.parse(line.slice(5));
            if (d.message?.content) { buf += d.message.content; setStreamBuf(buf); }
            if (d.done) {
              setChatHistory(h => [...h, { role: "assistant", content: buf || "(empty)" }]);
              setStreamBuf("");
            }
          } catch { /* skip */ }
        }
      }
    } catch {
      // Fallback to non-streaming
      try {
        const r2 = await fetch("/api/ollama/chat", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model: chatModel, messages: newHistory }),
        });
        const d = await r2.json() as { message?: { content?: string } };
        setChatHistory(h => [...h, { role: "assistant", content: d.message?.content ?? "Error" }]);
      } catch { /* give up */ }
    } finally { setChatLoading(false); setStreamBuf(""); }
  };

  if (!open) return null;

  const installedNames = new Set(status.models.map(m => m.name));
  const hovModel = hoveredModel !== null ? REPLIT_MODELS[hoveredModel] : null;
  const dlRunning = !dlStatus.done && !dlStatus.binExists && !status.binExists;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-[200] flex flex-col overflow-hidden"
      style={{ background: "radial-gradient(ellipse 120% 80% at 50% 30%, #0a0020 0%, #020008 55%, #000000 100%)" }}
    >
      {/* ── Scan line overlay ─────────────────────────────── */}
      <div className="pointer-events-none absolute inset-0 z-0"
        style={{ backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.12) 4px)", backgroundSize: "100% 4px" }} />

      {/* ── Animated bottom scan ──────────────────────────── */}
      <motion.div
        animate={{ x: ["-100%", "100%"] }}
        transition={{ repeat: Infinity, duration: 5, ease: "linear" }}
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-px z-50"
        style={{ background: "linear-gradient(90deg, transparent 0%, #7c3aed 40%, #00e5ff 50%, #7c3aed 60%, transparent 100%)" }}
      />

      {/* ═══════════════════════════════════════════════════
          HEADER
      ══════════════════════════════════════════════════ */}
      <div className="relative z-10 flex items-center justify-between px-4 pt-3 pb-[10px] flex-shrink-0"
        style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(24px)", borderBottom: "1px solid rgba(124,58,237,0.25)" }}>

        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="relative w-9 h-9">
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
              className="absolute inset-0 rounded-full border border-violet-500/50"
              style={{ borderTopColor: "#7c3aed", borderRightColor: "transparent", borderBottomColor: "transparent" }} />
            <div className="absolute inset-1.5 rounded-full bg-violet-900/60 flex items-center justify-center">
              <Atom className="w-4 h-4 text-violet-300" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-black tracking-[0.2em] bg-gradient-to-r from-violet-300 via-cyan-300 to-violet-400 bg-clip-text text-transparent">
                OLLAMA NEURAL HUB
              </span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border border-violet-600/40 text-violet-400 bg-violet-950/50 tracking-widest">MAX</span>
            </div>
            <div className="text-[9px] font-mono text-violet-500/50 tracking-[0.25em]">LOCAL AI MODEL COMMAND CENTER</div>
          </div>
        </div>

        {/* Status badges */}
        <div className="flex items-center gap-2">
          {/* Background download indicator */}
          {dlRunning && (
            <motion.div animate={{ opacity: [0.7, 1, 0.7] }} transition={{ repeat: Infinity, duration: 1.5 }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-amber-600/40 bg-amber-950/40">
              <Loader2 className="w-3 h-3 text-amber-400 animate-spin" />
              <span className="text-[9px] font-mono text-amber-400">DOWNLOADING BINARY...</span>
            </motion.div>
          )}
          {(dlStatus.binExists || status.binExists) && !status.running && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-cyan-600/40 bg-cyan-950/40">
              <CheckCircle2 className="w-3 h-3 text-cyan-400" />
              <span className="text-[9px] font-mono text-cyan-400">BINARY READY</span>
            </div>
          )}
          {status.running ? (
            <motion.div animate={{ opacity: [1,0.6,1] }} transition={{ repeat: Infinity, duration: 2 }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-emerald-600/30 bg-emerald-950/40">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-[9px] font-mono text-emerald-400">OLLAMA {status.version} ONLINE</span>
            </motion.div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-red-700/30 bg-red-950/30">
              <WifiOff className="w-3 h-3 text-red-500" />
              <span className="text-[9px] font-mono text-red-400">OFFLINE</span>
            </div>
          )}
          <div className="px-2.5 py-1 rounded-full border border-violet-700/30 bg-violet-950/30 text-[9px] font-mono text-violet-400">
            {status.models.length}/{REPLIT_MODELS.filter(m=>m.ok).length} MODELS · {running.length} ACTIVE
          </div>
          {/* ── Feature 8: Test Connection button ── */}
          <button onClick={handleTestConnection} disabled={testConn.testing}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all disabled:opacity-50 ${
              testConn.ok === true  ? "border border-emerald-600/40 bg-emerald-950/40 text-emerald-400" :
              testConn.ok === false ? "border border-red-700/40 bg-red-950/30 text-red-400" :
              "border border-cyan-700/40 bg-cyan-950/30 text-cyan-400"
            }`}>
            {testConn.testing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wifi className="w-3 h-3" />}
            {testConn.testing ? "TESTING..." : testConn.ok === true ? `OK ${testConn.latencyMs}ms` : testConn.ok === false ? "FAIL" : "TEST"}
          </button>
          <button onClick={fetchStatus}
            className="w-7 h-7 flex items-center justify-center rounded-lg border border-violet-800/30 text-violet-500 hover:text-violet-300 hover:border-violet-600/50 transition-all">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          {!status.running && (
            <button onClick={handleInstall} disabled={installing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition-all disabled:opacity-50 shadow-lg shadow-violet-900/40"
              style={{ background: "linear-gradient(135deg, #6d28d9 0%, #4c1d95 100%)", color: "white" }}>
              {installing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
              {installing ? "INSTALLING..." : "INSTALL & START"}
            </button>
          )}
          <button onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg border border-red-800/30 text-red-500 hover:text-red-300 hover:border-red-600/50 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════
          TABS
      ══════════════════════════════════════════════════ */}
      <div className="relative z-10 flex items-center gap-1 px-5 pt-2 pb-0 flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(124,58,237,0.15)" }}>
        {(["dashboard","library","chat","hf","groq","bench","compare","history"] as Tab[]).map(t => {
          const icons: Record<Tab, React.ReactNode> = {
            dashboard: <Network   className="w-3 h-3" />,
            library:   <Layers    className="w-3 h-3" />,
            chat:      <Terminal  className="w-3 h-3" />,
            hf:        <Globe     className="w-3 h-3" />,
            groq:      <Bolt      className="w-3 h-3" />,
            bench:     <BarChart3 className="w-3 h-3" />,
            compare:   <GitCompare className="w-3 h-3" />,
            history:   <History   className="w-3 h-3" />,
          };
          const labels: Record<Tab, string> = {
            dashboard: "NEURAL CORE",
            library:   "MODEL LIBRARY",
            chat:      "LOCAL CHAT",
            hf:        "HF SPACES",
            groq:      "GROQ ARENA",
            bench:     "BENCHMARK",
            compare:   "COMPARE",
            history:   "HISTORY",
          };
          return (
            <button key={t} onClick={() => setTab(t)}
              className={`relative flex items-center gap-1.5 px-4 py-2 text-[10px] font-bold tracking-widest rounded-t-lg transition-all ${
                tab === t
                  ? "text-violet-200 bg-violet-950/60"
                  : "text-violet-600 hover:text-violet-400"
              }`}>
              {icons[t]} {labels[t]}
              {tab === t && (
                <motion.div layoutId="tabBar" className="absolute bottom-0 left-0 right-0 h-px bg-violet-500" />
              )}
            </button>
          );
        })}
      </div>

      {/* ═══════════════════════════════════════════════════
          BODY
      ══════════════════════════════════════════════════ */}
      <div className="relative flex flex-1 overflow-hidden">

        {/* ── 3D Canvas (always visible) ─────────────────── */}
        <div className="relative flex-shrink-0 w-[45%] min-w-[380px] hidden lg:block">
          <canvas ref={canvasRef} className="w-full h-full cursor-crosshair" style={{ background: "transparent" }} />

          {/* Hover tooltip */}
          <AnimatePresence>
            {hovModel && (
              <motion.div key={hovModel.name}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-xl border pointer-events-none"
                style={{ borderColor: `${hovModel.color}40`, background: `rgba(0,0,0,0.85)`, backdropFilter: "blur(12px)" }}>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: hovModel.color, boxShadow: `0 0 8px ${hovModel.color}` }} />
                  <span className="text-xs font-bold text-white">{hovModel.label}</span>
                  <span className="text-[9px] font-mono px-1 rounded" style={{ backgroundColor: `${hovModel.color}20`, color: hovModel.color }}>{hovModel.tag}</span>
                </div>
                <div className="flex gap-3 text-[10px] font-mono text-white/50">
                  <span>{hovModel.size}</span>
                  <span>RAM: {hovModel.ram}</span>
                  <span className="font-bold" style={{ color: hovModel.color }}>{hovModel.speed}</span>
                </div>
                {installedNames.has(hovModel.name) && (
                  <div className="mt-1 flex items-center gap-1 text-[9px] text-emerald-400">
                    <CheckCircle2 className="w-2.5 h-2.5" /> INSTALLED — Click to chat
                  </div>
                )}
                {!installedNames.has(hovModel.name) && (
                  <div className="mt-1 text-[9px] text-violet-400/60">Click to pull model</div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bottom overlay — planet legend */}
          <div className="absolute bottom-3 left-3 right-3">
            <div className="grid grid-cols-4 gap-1.5 mb-2">
              {[
                { label: "INSTALLED",  value: status.models.length, color: "#10b981", icon: <Server     className="w-3 h-3" /> },
                { label: "RUNNING",    value: running.length,        color: "#00e5ff", icon: <Activity   className="w-3 h-3" /> },
                { label: "STORAGE",    value: status.models.reduce((a,m)=>a+(m.size||0),0) > 0 ? fmtBytes(status.models.reduce((a,m)=>a+(m.size||0),0)) : "0 GB", color: "#8b5cf6", icon: <HardDrive  className="w-3 h-3" /> },
                { label: "PULLING",    value: Object.keys(pulling).length, color: "#f59e0b", icon: <Download  className="w-3 h-3" /> },
              ].map(({ label, value, color, icon }) => (
                <div key={label} className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg border"
                  style={{ borderColor: `${color}25`, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}>
                  <span style={{ color }}>{icon}</span>
                  <div>
                    <div className="text-xs font-black" style={{ color }}>{value}</div>
                    <div className="text-[8px] font-mono" style={{ color: `${color}80` }}>{label}</div>
                  </div>
                </div>
              ))}
            </div>
            {/* Model ring legend */}
            <div className="flex flex-wrap gap-1">
              {REPLIT_MODELS.map((m, i) => (
                <motion.div key={m.name}
                  animate={installedNames.has(m.name) ? { opacity: [0.9,1,0.9] } : {}}
                  transition={{ repeat: Infinity, duration: 2, delay: i*0.3 }}
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded cursor-pointer"
                  style={{ background: "rgba(0,0,0,0.6)" }}
                  onClick={() => { setChatModel(m.name); setTab("chat"); }}>
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: m.color, boxShadow: installedNames.has(m.name) ? `0 0 5px ${m.color}` : "none", opacity: installedNames.has(m.name) ? 1 : 0.3 }} />
                  <span className="text-[8px] font-mono" style={{ color: installedNames.has(m.name) ? m.color : `${m.color}50` }}>
                    {m.label.split(" ").slice(0,2).join(" ")}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right Panel ─────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden"
          style={{ borderLeft: "1px solid rgba(124,58,237,0.2)", background: "rgba(2,0,12,0.88)", backdropFilter: "blur(20px)" }}>

          {/* ═══ DASHBOARD TAB ═══ */}
          {tab === "dashboard" && (
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {/* Install log */}
              {installLog.length > 0 && (
                <div className="rounded-xl border border-violet-700/30 bg-black/50 p-3 font-mono text-xs space-y-0.5 max-h-28 overflow-y-auto">
                  {installLog.map((l, i) => (
                    <div key={i} className={l.includes("fail") || l.includes("Error") ? "text-red-400" : l.includes("Running") || l.includes("Done") ? "text-emerald-400" : "text-violet-300"}>
                      <span className="text-violet-700 mr-2">&gt;</span>{l}
                    </div>
                  ))}
                </div>
              )}

              {/* Background download status */}
              {dlStatus.log && !status.running && (
                <div className="rounded-xl border border-amber-700/30 bg-amber-950/20 p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Download className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-[10px] font-bold text-amber-300 tracking-widest">BACKGROUND DOWNLOAD</span>
                  </div>
                  <div className="font-mono text-[9px] text-amber-400/60">{dlStatus.log}</div>
                  {dlStatus.binExists && (
                    <button onClick={handleInstall} disabled={installing}
                      className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-700 hover:bg-violet-600 text-white text-xs font-bold transition-all disabled:opacity-50">
                      <Play className="w-3 h-3" /> Start Ollama
                    </button>
                  )}
                </div>
              )}

              {/* Offline state */}
              {!status.running && !installing && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="flex flex-col items-center gap-5 py-10 text-center">
                  <div className="relative w-20 h-20">
                    <motion.div animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.1, 0.4] }} transition={{ repeat: Infinity, duration: 2.5 }}
                      className="absolute inset-0 rounded-full"
                      style={{ background: "radial-gradient(circle, rgba(124,58,237,0.3) 0%, transparent 70%)" }} />
                    <div className="absolute inset-3 rounded-full border border-violet-700/50 flex items-center justify-center">
                      <WifiOff className="w-8 h-8 text-violet-700" />
                    </div>
                  </div>
                  <div>
                    <p className="text-lg font-black text-violet-300 tracking-wider">OLLAMA OFFLINE</p>
                    <p className="text-xs text-violet-500/60 mt-1 font-mono">Install Ollama to run local AI models</p>
                    <p className="text-[10px] text-violet-700/50 mt-2">Replit free tier: small models only (no GPU).</p>
                    <p className="text-[10px] text-violet-700/50">Recommended: qwen2.5:0.5b — only 395MB</p>
                  </div>
                  <button onClick={handleInstall}
                    className="flex items-center gap-2 px-8 py-3 rounded-xl font-black text-sm tracking-wider transition-all shadow-2xl shadow-violet-900/60"
                    style={{ background: "linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%)", color: "white" }}>
                    <Download className="w-4 h-4" />
                    INSTALL OLLAMA
                  </button>
                </motion.div>
              )}

              {/* Installed models list */}
              {status.running && (
                <>
                  <div className="text-[9px] font-mono text-violet-600/50 tracking-[0.3em] pb-1 border-b border-violet-900/30">
                    INSTALLED MODELS — {status.models.length} / 7
                  </div>
                  {status.models.length === 0 && (
                    <div className="flex flex-col items-center gap-3 py-6 text-center">
                      <Brain className="w-10 h-10 text-violet-800" />
                      <p className="text-sm text-violet-400 font-bold">No models installed</p>
                      <p className="text-xs text-violet-600/50">Go to MODEL LIBRARY tab to pull models</p>
                    </div>
                  )}
                  {status.models.map((model, idx) => {
                    const isActive = running.some(r => r.name === model.name || r.model === model.name);
                    const match    = REPLIT_MODELS.find(m => m.name === model.name);
                    const color    = match?.color ?? MODEL_COLORS[idx % MODEL_COLORS.length];
                    return (
                      <motion.div key={model.name}
                        initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.04 }}
                        className="relative rounded-xl border overflow-hidden group"
                        style={{ borderColor: `${color}28`, background: `linear-gradient(135deg, ${color}06 0%, transparent 100%)` }}>
                        {isActive && (
                          <motion.div animate={{ opacity: [0.2, 0.5, 0.2] }} transition={{ repeat: Infinity, duration: 2.5 }}
                            className="absolute inset-0 pointer-events-none"
                            style={{ background: `radial-gradient(ellipse at left, ${color}18 0%, transparent 65%)` }} />
                        )}
                        <div className="flex items-center gap-3 p-3">
                          <div className="relative flex-shrink-0">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: isActive ? "#00ff88" : color, boxShadow: `0 0 10px ${isActive ? "#00ff88" : color}` }} />
                            {isActive && (
                              <motion.div animate={{ scale: [1, 2.2, 1], opacity: [0.8, 0, 0.8] }} transition={{ repeat: Infinity, duration: 1.8 }}
                                className="absolute inset-0 rounded-full" style={{ backgroundColor: "#00ff88" }} />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-white truncate">{model.name}</span>
                              {isActive && <span className="px-1.5 py-0.5 text-[8px] font-black rounded tracking-wider bg-emerald-900/50 text-emerald-400 border border-emerald-700/30">RUNNING</span>}
                            </div>
                            <div className="flex gap-2.5 mt-0.5 text-[9px] font-mono text-white/35">
                              <span>{fmtBytes(model.size)}</span>
                              {model.details?.parameter_size && <span>{model.details.parameter_size}</span>}
                              {model.details?.quantization_level && <span>{model.details.quantization_level}</span>}
                              {model.details?.family && <span className="capitalize">{model.details.family}</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => { setChatModel(model.name); setTab("chat"); }}
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-cyan-400 hover:bg-cyan-900/30 transition-all" title="Chat">
                              <Terminal className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDelete(model.name)}
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-900/30 transition-all" title="Delete">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </>
              )}
            </div>
          )}

          {/* ═══ LIBRARY TAB ═══ */}
          {tab === "library" && (
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              <div className="rounded-xl border border-amber-700/25 bg-amber-950/15 p-3 mb-3">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[10px] font-bold text-amber-300 tracking-widest">REPLIT-OPTIMISED — CPU ONLY, NO GPU</span>
                </div>
                <p className="text-[9px] text-amber-500/60 font-mono">
                  22 models — from 83MB to 4.7GB. ابدأ بـ SmolLM 135M (83MB) لأقصى سرعة أو qwen2.5:0.5b (395MB) للجودة.
                  Ollama يجب أن يعمل قبل تحميل النماذج.
                </p>

                {/* ── Custom model name input ── */}
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex-1 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border"
                    style={{ background: "rgba(0,0,0,0.4)", borderColor: "rgba(0,229,255,0.2)" }}>
                    <Plus className="w-3 h-3 text-cyan-600 shrink-0" />
                    <input
                      value={customModelName}
                      onChange={e => setCustomModelName(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleCustomPull()}
                      placeholder="اسم نموذج مخصص — مثل: llava:7b أو codellama:13b"
                      className="flex-1 bg-transparent text-[10px] font-mono text-cyan-300 placeholder-cyan-800 outline-none"
                    />
                  </div>
                  <button
                    onClick={handleCustomPull}
                    disabled={!customModelName.trim() || !status.running || customPulling}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all disabled:opacity-40 shrink-0"
                    style={{ background: customPulling ? "rgba(0,229,255,0.06)" : "rgba(0,229,255,0.14)", color: "#00e5ff", border: "1px solid rgba(0,229,255,0.3)" }}>
                    {customPulling ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                    {customPulling ? "PULLING..." : "PULL"}
                  </button>
                </div>

                {/* Auto-pull Queue */}
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  {!autoPullActive ? (
                    <button
                      onClick={handleAutoPullAll}
                      disabled={!status.running}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all disabled:opacity-40"
                      style={{ background: "rgba(0,229,255,0.12)", color: "#00e5ff", border: "1px solid rgba(0,229,255,0.3)" }}
                    >
                      <Download className="w-3 h-3" />
                      Auto-pull All Recommended
                    </button>
                  ) : (
                    <button
                      onClick={stopAutoPull}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all"
                      style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }}
                    >
                      <X className="w-3 h-3" />
                      Stop Queue
                    </button>
                  )}
                  {autoPullDone.length > 0 && (
                    <span className="text-[9px] text-emerald-400 font-mono">✓ {autoPullDone.length} pulled</span>
                  )}
                  {autoPullQueue.length > 0 && (
                    <span className="text-[9px] text-white/30 font-mono">{autoPullQueue.length} queued</span>
                  )}
                </div>

                {/* Active pull indicator */}
                {autoPullCurrent && (
                  <div className="mt-2 flex items-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin text-cyan-400" />
                    <span className="text-[9px] font-mono text-cyan-400">Pulling: {autoPullCurrent}</span>
                    <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "rgba(0,229,255,0.1)" }}>
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: "#00e5ff" }}
                        animate={{ width: [`${pulling[autoPullCurrent] ?? 0}%`] }}
                      />
                    </div>
                    <span className="text-[9px] font-mono text-cyan-400">{pulling[autoPullCurrent] ?? 0}%</span>
                  </div>
                )}

                {/* Queue list */}
                {autoPullQueue.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {autoPullQueue.map(name => (
                      <span key={name} className="text-[8px] px-1.5 py-0.5 rounded font-mono text-white/30"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        {name.split(":")[0]}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Auto-Cleanup: Stuck Partial Downloads ── */}
              <div className="rounded-xl border overflow-hidden"
                style={{ borderColor: cleanupDone ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.2)", background: cleanupDone ? "rgba(16,185,129,0.04)" : "rgba(239,68,68,0.03)" }}>
                <div className="flex items-center justify-between px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <motion.div
                      animate={cleanupLoading ? { rotate: 360 } : { rotate: 0 }}
                      transition={{ repeat: cleanupLoading ? Infinity : 0, duration: 1.2, ease: "linear" }}>
                      <RefreshCw className="w-3.5 h-3.5" style={{ color: cleanupDone ? "#10b981" : "#ef4444" }} />
                    </motion.div>
                    <span className="text-[10px] font-bold tracking-widest" style={{ color: cleanupDone ? "#10b981" : "#ef4444" }}>
                      {cleanupDone ? "CLEANUP COMPLETE" : "BLOB CLEANUP SCANNER"}
                    </span>
                    {cleanupFiles.length > 0 && !cleanupDone && (
                      <span className="text-[8px] px-1.5 py-0.5 rounded font-black"
                        style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }}>
                        {cleanupFiles.length} stuck
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={handleScanCleanup} disabled={cleanupLoading}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-bold transition-all disabled:opacity-40 hover:scale-105"
                      style={{ background: "rgba(0,229,255,0.1)", color: "#00e5ff", border: "1px solid rgba(0,229,255,0.25)" }}>
                      {cleanupLoading ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Activity className="w-2.5 h-2.5" />}
                      SCAN
                    </button>
                    {cleanupFiles.length > 0 && (
                      <button onClick={handleDoCleanup} disabled={cleanupLoading}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-bold transition-all disabled:opacity-40 hover:scale-105"
                        style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }}>
                        <Trash2 className="w-2.5 h-2.5" /> DELETE ALL
                      </button>
                    )}
                  </div>
                </div>
                <AnimatePresence>
                  {cleanupFiles.length > 0 && !cleanupDone && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      className="px-4 pb-3 space-y-1 border-t" style={{ borderColor: "rgba(239,68,68,0.15)" }}>
                      <div className="text-[8px] font-mono text-white/25 mt-2 mb-1 tracking-widest">STUCK PARTIAL FILES</div>
                      {cleanupFiles.map(f => (
                        <div key={f.name} className="flex items-center justify-between text-[9px] font-mono">
                          <span className="text-red-400/70 truncate flex-1">{f.name}</span>
                          <span className="text-white/25 ml-3">{(f.size / 1024 / 1024).toFixed(1)} MB</span>
                        </div>
                      ))}
                    </motion.div>
                  )}
                  {cleanupDone && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-4 pb-3">
                      <p className="text-[9px] font-mono text-emerald-400/60">✓ All stuck downloads cleared — pull will work cleanly now</p>
                    </motion.div>
                  )}
                  {cleanupFiles.length === 0 && !cleanupDone && !cleanupLoading && (
                    <div className="px-4 pb-3">
                      <p className="text-[9px] font-mono text-white/20">Scan to detect stuck .part files that block model downloads</p>
                    </div>
                  )}
                </AnimatePresence>
              </div>

              {/* ── Feature 3 & 5: RAM/Disk stats bar ── */}
              {sysInfo && sysInfo.totalRam > 0 && (
                <div className="rounded-xl border border-violet-700/20 bg-violet-950/10 p-3 space-y-2">
                  <div className="text-[9px] font-mono text-violet-500/50 tracking-widest">SYSTEM RESOURCES</div>
                  <div className="space-y-1.5">
                    {/* RAM bar */}
                    <div className="flex items-center gap-2">
                      <MemoryStick className="w-3 h-3 text-violet-400/60 flex-shrink-0" />
                      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${(sysInfo.usedRam / sysInfo.totalRam) * 100}%`,
                            background: sysInfo.usedRam / sysInfo.totalRam > 0.85 ? "#ef4444" :
                              sysInfo.usedRam / sysInfo.totalRam > 0.65 ? "#f59e0b" : "#8b5cf6",
                          }} />
                      </div>
                      <span className="text-[8px] font-mono text-white/30 w-20 text-right">
                        {Math.round(sysInfo.usedRam / 1024 / 1024)}MB / {Math.round(sysInfo.totalRam / 1024 / 1024)}MB
                      </span>
                    </div>
                    {/* Disk bar */}
                    <div className="flex items-center gap-2">
                      <HardDrive className="w-3 h-3 text-cyan-400/60 flex-shrink-0" />
                      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: sysInfo.diskTotal > 0 ? `${(sysInfo.diskUsed / sysInfo.diskTotal) * 100}%` : "0%",
                            background: sysInfo.diskUsed / sysInfo.diskTotal > 0.9 ? "#ef4444" : "#06b6d4",
                          }} />
                      </div>
                      <span className="text-[8px] font-mono text-white/30 w-20 text-right">
                        {Math.round(sysInfo.diskUsed / 1024 / 1024 / 1024 * 10) / 10}GB / {Math.round(sysInfo.diskTotal / 1024 / 1024 / 1024 * 10) / 10}GB
                      </span>
                    </div>
                    {/* Models dir */}
                    {sysInfo.modelsDirSize > 0 && (
                      <div className="text-[8px] font-mono text-violet-700/50">
                        Models: {Math.round(sysInfo.modelsDirSize / 1024 / 1024)}MB on disk
                      </div>
                    )}
                  </div>
                </div>
              )}

              {REPLIT_MODELS.map((m, idx) => {
                const installed = installedNames.has(m.name);
                const isPulling  = m.name in pulling;
                const pct        = pulling[m.name] ?? 0;
                const log        = pullLog[m.name] ?? "";
                // ── Feature 4 & 5: RAM compatibility & size warnings ──
                const modelRamMB = parseInt(m.ram.replace(/[^0-9.]/g, "")) || 0;
                const freeRamMB  = sysInfo ? Math.round(sysInfo.freeRam / 1024 / 1024) : 0;
                const ramCompat  = !sysInfo ? "unknown" :
                  freeRamMB >= modelRamMB * 1.3 ? "green" :
                  freeRamMB >= modelRamMB * 0.8  ? "yellow" : "red";
                const ramCompatColor = ramCompat === "green" ? "#10b981" : ramCompat === "yellow" ? "#f59e0b" : "#ef4444";
                const ramCompatLabel = ramCompat === "green" ? "RAM OK" : ramCompat === "yellow" ? "RAM LOW" : "RAM WARN";
                return (
                  <motion.div key={m.name}
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}
                    className="relative rounded-xl border overflow-hidden group transition-all"
                    style={{ borderColor: `${m.color}28`, background: `linear-gradient(135deg, ${m.color}05 0%, transparent 100%)` }}>

                    {installed && (
                      <motion.div animate={{ opacity: [0.15, 0.35, 0.15] }} transition={{ repeat: Infinity, duration: 3 }}
                        className="absolute inset-0 pointer-events-none"
                        style={{ background: `radial-gradient(ellipse at top left, ${m.color}12 0%, transparent 70%)` }} />
                    )}

                    <div className="flex items-center gap-3 p-3.5">
                      {/* Tag badge */}
                      <div className="w-9 h-9 rounded-xl flex-shrink-0 flex flex-col items-center justify-center border font-black text-[9px]"
                        style={{ borderColor: `${m.color}50`, backgroundColor: `${m.color}12`, color: m.color }}>
                        <span>{m.tag}</span>
                        <span className="text-[7px] opacity-60 mt-0.5">{m.geo.slice(0,4).toUpperCase()}</span>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className="font-bold text-sm text-white">{m.label}</span>
                          {!m.ok && <span className="text-[8px] px-1 rounded border border-amber-600/30 text-amber-500 flex items-center gap-0.5"><AlertTriangle className="w-2 h-2" /> HEAVY</span>}
                          {m.ok  && <span className="text-[8px] px-1 rounded border border-emerald-700/30 text-emerald-500">REPLIT OK</span>}
                          {/* ── Feature 4: RAM compat badge ── */}
                          {sysInfo && (
                            <span className="text-[8px] px-1.5 py-0.5 rounded font-bold flex items-center gap-0.5"
                              style={{ backgroundColor: `${ramCompatColor}15`, color: ramCompatColor, border: `1px solid ${ramCompatColor}35` }}>
                              <MemoryStick className="w-2 h-2" />
                              {ramCompatLabel}
                            </span>
                          )}
                        </div>
                        <div className="text-[9px] font-mono text-white/35">{m.name}</div>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          <div className="flex items-center gap-1">
                            <HardDrive className="w-2.5 h-2.5" style={{ color: m.color }} />
                            <span className="text-[9px] font-mono" style={{ color: m.color }}>{m.size}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MemoryStick className="w-2.5 h-2.5" style={{ color: ramCompat === "unknown" ? "rgba(255,255,255,0.3)" : ramCompatColor }} />
                            <span className="text-[9px] font-mono font-bold" style={{ color: ramCompat === "unknown" ? "rgba(255,255,255,0.3)" : ramCompatColor }}>{m.ram}</span>
                          </div>
                          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded"
                            style={{ backgroundColor: `${m.color}15`, color: m.color }}>
                            {m.speed}
                          </span>
                        </div>
                        {/* Pull progress bar */}
                        {isPulling && (
                          <div className="mt-2">
                            <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: `${m.color}20` }}>
                              <motion.div animate={{ width: `${pct}%` }} transition={{ type: "spring", stiffness: 50 }}
                                className="h-full rounded-full" style={{ backgroundColor: m.color }} />
                            </div>
                            <div className="flex justify-between mt-0.5">
                              <span className="text-[8px] font-mono truncate max-w-[70%]" style={{ color: `${m.color}80` }}>{log}</span>
                              <span className="text-[8px] font-mono" style={{ color: m.color }}>{pct}%</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Action */}
                      <div className="flex-shrink-0">
                        {installed ? (
                          <div className="flex flex-col items-end gap-1">
                            <div className="flex items-center gap-1 px-2 py-1 rounded-lg border border-emerald-700/30 bg-emerald-950/40">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              <span className="text-[9px] font-bold text-emerald-400">INSTALLED</span>
                            </div>
                            <button onClick={() => { setChatModel(m.name); setTab("chat"); }}
                              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold transition-all"
                              style={{ backgroundColor: `${m.color}15`, color: m.color, borderWidth: 1, borderColor: `${m.color}30` }}>
                              <Terminal className="w-2.5 h-2.5" /> CHAT
                            </button>
                          </div>
                        ) : isPulling ? (
                          <div className="w-10 h-10 rounded-full flex items-center justify-center border"
                            style={{ borderColor: m.color, background: `${m.color}10` }}>
                            <span className="text-xs font-black" style={{ color: m.color }}>{pct}</span>
                          </div>
                        ) : (
                          <button onClick={() => handlePull(m.name)} disabled={!status.running}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-30 hover:scale-105"
                            style={{ backgroundColor: `${m.color}18`, borderWidth: 1, borderColor: `${m.color}40`, color: m.color }}>
                            <Download className="w-3.5 h-3.5" />
                            PULL
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* ═══ CHAT TAB ═══ */}
          {tab === "chat" && (
            <div className="flex-1 flex flex-col overflow-hidden p-4 gap-3">
              {/* Model selector */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="flex-1 relative">
                  <select value={chatModel} onChange={e => setChatModel(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border text-violet-200 text-xs font-mono focus:outline-none appearance-none cursor-pointer"
                    style={{ background: "rgba(0,0,0,0.6)", borderColor: "rgba(124,58,237,0.35)", backdropFilter: "blur(8px)" }}>
                    <option value="">— Select a model —</option>
                    {status.models.map(m => <option key={m.name} value={m.name}>{m.name}</option>)}
                  </select>
                </div>
                <button onClick={() => setChatHistory([])}
                  className="w-7 h-7 flex items-center justify-center rounded-xl border border-violet-800/30 text-violet-500 hover:text-violet-300 transition-all" title="Clear chat">
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-0">
                {chatHistory.length === 0 && !streamBuf && (
                  <div className="flex flex-col items-center gap-3 py-10 text-center opacity-40">
                    <div className="relative">
                      <Brain className="w-10 h-10 text-violet-700" />
                      <motion.div animate={{ scale: [1,1.4,1], opacity: [0.5,0,0.5] }} transition={{ repeat: Infinity, duration: 2 }}
                        className="absolute inset-0 rounded-full" style={{ background: "radial-gradient(circle, rgba(124,58,237,0.3) 0%, transparent 70%)" }} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-violet-400">{chatModel ? `Ready to chat with ${chatModel}` : "Select a model to start"}</p>
                      <p className="text-[10px] text-violet-600 mt-1 font-mono">Messages stream in real time</p>
                    </div>
                  </div>
                )}
                {chatHistory.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "rounded-tr-sm"
                        : "rounded-tl-sm"
                    }`}
                      style={msg.role === "user"
                        ? { background: "rgba(109,40,217,0.35)", border: "1px solid rgba(139,92,246,0.3)", color: "#ede9fe" }
                        : { background: "rgba(0,0,0,0.5)", border: "1px solid rgba(16,185,129,0.2)", color: "#d1fae5" }
                      }>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {/* Streaming message */}
                {streamBuf && (
                  <div className="flex justify-start">
                    <div className="max-w-[82%] px-3.5 py-2.5 rounded-2xl rounded-tl-sm text-xs leading-relaxed whitespace-pre-wrap"
                      style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(16,185,129,0.25)", color: "#d1fae5" }}>
                      {streamBuf}
                      <motion.span animate={{ opacity: [1,0,1] }} transition={{ repeat: Infinity, duration: 0.7 }}
                        className="inline-block w-1.5 h-3 bg-emerald-400 ml-0.5 align-middle" />
                    </div>
                  </div>
                )}
                {chatLoading && !streamBuf && (
                  <div className="flex justify-start">
                    <div className="px-3.5 py-2.5 rounded-2xl rounded-tl-sm"
                      style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(16,185,129,0.2)" }}>
                      <div className="flex gap-1.5 items-center">
                        {[0,1,2].map(i => (
                          <motion.div key={i} animate={{ opacity: [0.3,1,0.3], scale: [1,1.3,1] }}
                            transition={{ repeat: Infinity, duration: 1, delay: i * 0.25 }}
                            className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input */}
              <div className="flex gap-2 flex-shrink-0">
                <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !e.shiftKey && !e.ctrlKey && handleChat()}
                  placeholder={status.running && chatModel ? `Message ${chatModel}...` : "Start Ollama and select a model first..."}
                  disabled={!status.running || !chatModel || chatLoading}
                  className="flex-1 px-4 py-2.5 rounded-xl text-xs font-mono placeholder-violet-800 focus:outline-none transition-all disabled:opacity-40"
                  style={{ background: "rgba(0,0,0,0.6)", border: "1px solid rgba(124,58,237,0.3)", color: "#ede9fe" }} />
                <button onClick={handleChat} disabled={!status.running || !chatModel || chatLoading}
                  className="px-4 py-2.5 rounded-xl transition-all disabled:opacity-40 hover:scale-105"
                  style={{ background: "linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%)", color: "white" }}>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ═══ HF SPACES TAB ═══ */}
          {tab === "hf" && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Connect form */}
              <div className="rounded-xl border border-violet-700/25 bg-violet-950/15 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-violet-400" />
                  <span className="text-sm font-bold text-violet-200">HuggingFace Spaces — Remote GPU Ollama</span>
                </div>
                <p className="text-[10px] text-violet-500/60 font-mono leading-relaxed">
                  Run large models (Llama 3.3 70B, DeepSeek 67B) on HuggingFace T4 GPU.
                  Connect your app to the remote Ollama instance.
                </p>
                <div className="space-y-2">
                  <label className="text-[9px] font-mono text-violet-500/60 tracking-widest">SPACE URL</label>
                  <input value={hfUrl} onChange={e => setHfUrl(e.target.value)}
                    placeholder="https://username-space.hf.space"
                    className="w-full px-3 py-2 rounded-lg text-xs font-mono placeholder-violet-900/60 focus:outline-none"
                    style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(124,58,237,0.35)", color: "#c4b5fd" }} />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-mono text-violet-500/60 tracking-widest">API KEY</label>
                  <input value={hfKey} onChange={e => setHfKey(e.target.value)} type="password"
                    placeholder="your-secret-api-key"
                    className="w-full px-3 py-2 rounded-lg text-xs font-mono placeholder-violet-900/60 focus:outline-none"
                    style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(124,58,237,0.35)", color: "#c4b5fd" }} />
                </div>
                <button onClick={() => { localStorage.setItem("ollama-hf-url", hfUrl); localStorage.setItem("ollama-hf-key", hfKey); }}
                  className="w-full py-2.5 rounded-xl font-bold text-xs tracking-wider transition-all hover:scale-[1.02]"
                  style={{ background: "linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%)", color: "white" }}>
                  SAVE & CONNECT
                </button>
              </div>

              {/* Setup guide */}
              <div className="rounded-xl border border-cyan-800/25 bg-cyan-950/10 p-4">
                <h3 className="text-[10px] font-bold text-cyan-300 tracking-widest mb-3">SETUP GUIDE</h3>
                <div className="space-y-2">
                  {[
                    { step: "1", text: "Go to huggingface.co/spaces → New Space" },
                    { step: "2", text: "Choose Docker SDK, enable GPU T4 (free tier)" },
                    { step: "3", text: "Upload all files from hf-spaces/ folder in your project" },
                    { step: "4", text: "Add secret: API_KEY=<your-secret-key>" },
                    { step: "5", text: "Add env var: PRELOAD_MODELS=llama3.2:3b" },
                    { step: "6", text: "Copy Space URL above and save" },
                  ].map(({ step, text }) => (
                    <div key={step} className="flex items-start gap-2.5">
                      <div className="w-4 h-4 rounded flex-shrink-0 flex items-center justify-center text-[8px] font-black mt-0.5"
                        style={{ backgroundColor: "rgba(6,182,212,0.2)", color: "#06b6d4", border: "1px solid rgba(6,182,212,0.3)" }}>
                        {step}
                      </div>
                      <span className="text-[10px] text-cyan-400/60 font-mono leading-tight">{text}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* GPU models */}
              <div className="rounded-xl border border-emerald-800/25 bg-emerald-950/10 p-4">
                <h3 className="text-[10px] font-bold text-emerald-300 tracking-widest mb-3">RECOMMENDED FOR HF GPU</h3>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { name: "llama3.3:70b", size: "40GB", speed: "POWERFUL" },
                    { name: "deepseek-r1:7b", size: "4GB", speed: "FAST" },
                    { name: "qwen2.5:72b", size: "41GB", speed: "SMART" },
                    { name: "mistral:7b", size: "4GB", speed: "FAST" },
                    { name: "llava:34b", size: "20GB", speed: "VISION" },
                    { name: "codestral:22b", size: "12GB", speed: "CODE" },
                  ].map(m => (
                    <div key={m.name} className="px-2.5 py-2 rounded-lg border border-emerald-800/20 bg-emerald-950/30">
                      <div className="text-[9px] font-bold text-emerald-300">{m.name}</div>
                      <div className="flex gap-2 mt-0.5">
                        <span className="text-[8px] font-mono text-emerald-600">{m.size}</span>
                        <span className="text-[8px] font-bold text-emerald-500">{m.speed}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* API reference */}
              <div className="rounded-xl border border-violet-800/20 bg-violet-950/10 p-4">
                <h3 className="text-[10px] font-bold text-violet-300 tracking-widest mb-2">API ENDPOINTS</h3>
                <div className="font-mono text-[9px] space-y-1 text-violet-400/50">
                  {[
                    ["GET",  "/api/tags",    "List models"],
                    ["POST", "/api/chat",    "Chat"],
                    ["POST", "/api/generate","Generate"],
                    ["POST", "/api/pull",    "Pull model"],
                  ].map(([method, path, desc]) => (
                    <div key={path} className="flex gap-2 items-center">
                      <span className="text-violet-500 w-8">{method}</span>
                      <span className="text-violet-300">{hfUrl || "https://your-space.hf.space"}{path}</span>
                      <span className="text-violet-700">— {desc}</span>
                    </div>
                  ))}
                </div>
                {hfKey && (
                  <div className="mt-2 text-[9px] font-mono text-violet-600">
                    Authorization: Bearer *** (saved)
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══ GROQ ARENA TAB ═══ */}
          {tab === "groq" && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Header */}
              <div className="relative rounded-[18px] border overflow-hidden p-5"
                style={{ borderColor: "rgba(251,191,36,0.25)", background: "linear-gradient(135deg, rgba(251,191,36,0.06) 0%, rgba(0,0,0,0.8) 100%)" }}>
                <motion.div
                  animate={{ opacity: [0.15, 0.35, 0.15] }} transition={{ repeat: Infinity, duration: 3 }}
                  className="absolute inset-0 pointer-events-none"
                  style={{ background: "radial-gradient(ellipse at top right, rgba(251,191,36,0.2) 0%, transparent 70%)" }} />
                <div className="flex items-center gap-3 mb-3">
                  <div className="relative w-10 h-10">
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 6, ease: "linear" }}
                      className="absolute inset-0 rounded-full"
                      style={{ border: "1px solid rgba(251,191,36,0.5)", borderTopColor: "#fbbf24", borderRightColor: "transparent" }} />
                    <div className="absolute inset-2 rounded-full flex items-center justify-center"
                      style={{ background: "rgba(251,191,36,0.1)" }}>
                      <Bolt className="w-4 h-4 text-amber-400" />
                    </div>
                  </div>
                  <div>
                    <div className="text-base font-black tracking-widest text-amber-300">GROQ ARENA</div>
                    <div className="text-[9px] font-mono text-amber-600/60 tracking-widest">GPU-SPEED FREE INFERENCE ENGINE</div>
                  </div>
                  <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[9px] font-bold"
                    style={{ borderColor: "rgba(251,191,36,0.35)", color: "#fbbf24", background: "rgba(251,191,36,0.08)" }}>
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    FREE TIER
                  </div>
                </div>
                <p className="text-[10px] text-amber-500/60 font-mono leading-relaxed">
                  Groq runs LLaMA 3, Mistral, Mixtral at real GPU speed — free, no GPU required on your side.
                  Get your free API key at console.groq.com
                </p>
              </div>

              {/* API Key input */}
              <div className="rounded-xl border p-4 space-y-3"
                style={{ borderColor: "rgba(251,191,36,0.2)", background: "rgba(251,191,36,0.03)" }}>
                <label className="text-[9px] font-mono text-amber-600/60 tracking-widest">GROQ API KEY</label>
                <div className="flex gap-2">
                  <input
                    value={groqKeyInput} onChange={e => setGroqKeyInput(e.target.value)}
                    type="password"
                    placeholder="gsk_xxxxxxxxxxxxxxxxxxxx"
                    className="flex-1 px-3 py-2 rounded-lg text-xs font-mono placeholder-amber-900/40 focus:outline-none"
                    style={{ background: "rgba(0,0,0,0.6)", border: "1px solid rgba(251,191,36,0.3)", color: "#fde68a" }}
                  />
                  <button onClick={handleSaveGroqKey}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all hover:scale-105"
                    style={{ background: groqSaved ? "rgba(16,185,129,0.2)" : "rgba(251,191,36,0.15)", color: groqSaved ? "#34d399" : "#fbbf24", border: `1px solid ${groqSaved ? "rgba(16,185,129,0.4)" : "rgba(251,191,36,0.35)"}` }}>
                    {groqSaved ? <><Check className="w-3 h-3" /> SAVED</> : "SAVE"}
                  </button>
                  <button onClick={handleTestGroq} disabled={groqTesting || !groqKeyInput}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-40"
                    style={{ background: "rgba(0,229,255,0.1)", color: "#00e5ff", border: "1px solid rgba(0,229,255,0.3)" }}>
                    {groqTesting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wifi className="w-3 h-3" />}
                    TEST
                  </button>
                </div>
                {groqTestRes && (
                  <div className={`flex items-center gap-2 text-[10px] font-mono ${groqTestRes.ok ? "text-emerald-400" : "text-red-400"}`}>
                    {groqTestRes.ok ? <CheckCircle2 className="w-3 h-3" /> : <X className="w-3 h-3" />}
                    {groqTestRes.ok ? `Connection OK — ${groqTestRes.ms}ms` : `Connection FAILED — ${groqTestRes.ms}ms`}
                  </div>
                )}
                {groqKey && !groqTestRes && (
                  <div className="flex items-center gap-2 text-[9px] font-mono text-amber-500/50">
                    <CheckCircle2 className="w-3 h-3 text-amber-500" /> Key saved — {groqKey.slice(0, 8)}***
                  </div>
                )}
              </div>

              {/* Groq model cards */}
              <div className="text-[9px] font-mono text-amber-600/40 tracking-widest mb-2">FREE MODELS — INSTANT GPU SPEED</div>
              <div className="space-y-2.5">
                {[
                  { id: "llama-3.1-8b-instant", label: "LLaMA 3.1 8B Instant", desc: "Ultra-fast, best for real-time apps", tps: "800+", ctx: "128K", badge: "FASTEST", badgeColor: "#00e5ff" },
                  { id: "llama-3.3-70b-versatile", label: "LLaMA 3.3 70B Versatile", desc: "Premium quality, large reasoning capacity", tps: "150+", ctx: "128K", badge: "SMARTEST", badgeColor: "#fbbf24" },
                  { id: "mixtral-8x7b-32768", label: "Mixtral 8×7B 32K", desc: "MoE architecture, long context window", tps: "400+", ctx: "32K", badge: "BALANCED", badgeColor: "#a78bfa" },
                  { id: "gemma2-9b-it", label: "Gemma2 9B IT", desc: "Google's instruction-tuned model", tps: "500+", ctx: "8K", badge: "EFFICIENT", badgeColor: "#10b981" },
                  { id: "deepseek-r1-distill-llama-70b", label: "DeepSeek R1 70B", desc: "Chain-of-thought reasoning specialist", tps: "130+", ctx: "128K", badge: "REASONING", badgeColor: "#f97316" },
                ].map((m, i) => (
                  <motion.div key={m.id}
                    initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                    className="relative rounded-xl border overflow-hidden group"
                    style={{ borderColor: `${m.badgeColor}22`, background: `linear-gradient(135deg, ${m.badgeColor}06 0%, transparent 100%)` }}>
                    <motion.div animate={{ opacity: [0.1, 0.25, 0.1] }} transition={{ repeat: Infinity, duration: 3 + i * 0.5 }}
                      className="absolute inset-0 pointer-events-none"
                      style={{ background: `radial-gradient(ellipse at left, ${m.badgeColor}12 0%, transparent 65%)` }} />
                    <div className="flex items-center gap-3 p-3.5">
                      <div className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center text-[8px] font-black"
                        style={{ background: `${m.badgeColor}15`, border: `1px solid ${m.badgeColor}40`, color: m.badgeColor }}>
                        <Bolt className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-bold text-sm text-white">{m.label}</span>
                          <span className="text-[8px] px-1.5 py-0.5 rounded font-black tracking-wider"
                            style={{ backgroundColor: `${m.badgeColor}18`, color: m.badgeColor, border: `1px solid ${m.badgeColor}35` }}>
                            {m.badge}
                          </span>
                        </div>
                        <div className="text-[9px] font-mono text-white/35">{m.id}</div>
                        <div className="flex items-center gap-3 mt-1">
                          <div className="flex items-center gap-1">
                            <Gauge className="w-2.5 h-2.5" style={{ color: m.badgeColor }} />
                            <span className="text-[9px] font-mono font-bold" style={{ color: m.badgeColor }}>{m.tps} tok/s</span>
                          </div>
                          <span className="text-[9px] font-mono text-white/30">CTX {m.ctx}</span>
                          <span className="text-[9px] text-white/25 italic">{m.desc}</span>
                        </div>
                      </div>
                      <div className="flex-shrink-0 flex flex-col gap-1">
                        <div className="px-2 py-1 rounded-lg text-[8px] font-bold text-emerald-400 border border-emerald-700/30 bg-emerald-950/30">
                          FREE
                        </div>
                        <div className="px-2 py-1 rounded-lg text-[8px] font-bold text-amber-400/60 border border-amber-800/20 bg-amber-950/20">
                          GPU
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Stats comparison */}
              <div className="rounded-xl border border-amber-800/20 bg-amber-950/10 p-4">
                <h3 className="text-[10px] font-bold text-amber-300 tracking-widest mb-3">LOCAL vs GROQ SPEED</h3>
                <div className="space-y-2">
                  {[
                    { name: "Groq LLaMA 3.1 8B", tps: 800, color: "#fbbf24" },
                    { name: "Groq Mixtral 8×7B", tps: 400, color: "#a78bfa" },
                    { name: "Local phi3:mini", tps: 35, color: "#60a5fa" },
                    { name: "Local gemma:2b", tps: 18, color: "#34d399" },
                    { name: "Local tinyllama", tps: 22, color: "#f97316" },
                  ].map(item => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div className="w-24 text-[9px] font-mono text-white/40 truncate">{item.name}</div>
                      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, (item.tps / 800) * 100)}%` }}
                          transition={{ delay: 0.3, duration: 0.8 }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                      </div>
                      <div className="w-16 text-[9px] font-mono text-right" style={{ color: item.color }}>
                        {item.tps} t/s
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Get key link */}
              <div className="rounded-xl border border-amber-800/20 p-3 flex items-center gap-3 bg-amber-950/10">
                <Shield className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-[10px] font-bold text-amber-300">Get Free API Key</div>
                  <div className="text-[9px] font-mono text-amber-600/50">console.groq.com → API Keys → Create Key</div>
                </div>
                <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all hover:scale-105"
                  style={{ background: "rgba(251,191,36,0.15)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.3)" }}>
                  OPEN →
                </a>
              </div>
            </div>
          )}

          {/* ═══ BENCHMARK TAB ═══ */}
          {tab === "bench" && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Config */}
              <div className="rounded-xl border border-cyan-700/25 bg-cyan-950/10 p-4 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <BarChart3 className="w-4 h-4 text-cyan-400" />
                  <span className="text-[10px] font-bold text-cyan-300 tracking-widest">BENCHMARK CONFIGURATION</span>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-mono text-cyan-600/50 tracking-widest">PROMPT</label>
                  <textarea
                    value={benchPrompt} onChange={e => setBenchPrompt(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg text-xs font-mono focus:outline-none resize-none"
                    style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(6,182,212,0.3)", color: "#a5f3fc" }}
                  />
                </div>
                <div className="flex gap-3 items-end">
                  <div className="space-y-1 flex-1">
                    <label className="text-[9px] font-mono text-cyan-600/50 tracking-widest">RUNS PER MODEL</label>
                    <div className="flex gap-1">
                      {[1, 2, 3, 5, 10].map(n => (
                        <button key={n} onClick={() => setBenchRuns(n)}
                          className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all ${benchRuns === n ? "text-cyan-200" : "text-cyan-700 hover:text-cyan-400"}`}
                          style={{ background: benchRuns === n ? "rgba(6,182,212,0.2)" : "transparent", border: `1px solid ${benchRuns === n ? "rgba(6,182,212,0.5)" : "rgba(6,182,212,0.1)"}` }}>
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={benchRunning ? undefined : handleBenchmark}
                    disabled={benchRunning || benchModels.length === 0 || !status.running}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs tracking-wider transition-all disabled:opacity-40 hover:scale-105"
                    style={{ background: "linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)", color: "white" }}>
                    {benchRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FlaskConical className="w-3.5 h-3.5" />}
                    {benchRunning ? "RUNNING..." : "RUN BENCHMARK"}
                  </button>
                </div>

                {/* Model checkboxes */}
                <div>
                  <label className="text-[9px] font-mono text-cyan-600/50 tracking-widest mb-2 block">SELECT MODELS TO BENCHMARK</label>
                  <div className="flex flex-wrap gap-1.5">
                    {status.models.map(m => {
                      const sel = benchModels.includes(m.name);
                      const match = REPLIT_MODELS.find(r => r.name === m.name);
                      const color = match?.color ?? "#00e5ff";
                      return (
                        <button key={m.name}
                          onClick={() => setBenchModels(prev => sel ? prev.filter(x => x !== m.name) : [...prev, m.name])}
                          className="px-2.5 py-1 rounded-lg text-[9px] font-bold transition-all hover:scale-105"
                          style={{
                            background: sel ? `${color}20` : "rgba(255,255,255,0.04)",
                            color: sel ? color : "rgba(255,255,255,0.3)",
                            border: `1px solid ${sel ? color + "40" : "rgba(255,255,255,0.08)"}`,
                          }}>
                          {m.name}
                        </button>
                      );
                    })}
                    {status.models.length === 0 && (
                      <span className="text-[9px] font-mono text-white/25">No installed models — pull from Library tab first</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Progress */}
              {benchRunning && benchProgress && (
                <div className="flex items-center gap-2 text-[10px] font-mono text-cyan-400 animate-pulse">
                  <Loader2 className="w-3 h-3 animate-spin" /> {benchProgress}
                </div>
              )}

              {/* Results */}
              {benchResults.length > 0 && (
                <div className="space-y-3">
                  <div className="text-[9px] font-mono text-cyan-600/50 tracking-widest">BENCHMARK RESULTS — {benchRuns} RUNS</div>
                  {benchResults.map((res, idx) => {
                    const match = REPLIT_MODELS.find(r => r.name === res.name);
                    const color = match?.color ?? "#00e5ff";
                    const maxTps = Math.max(...benchResults.map(r => r.avgTps), 1);
                    return (
                      <motion.div key={res.name}
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.07 }}
                        className="rounded-xl border p-4 space-y-3"
                        style={{ borderColor: `${color}25`, background: `linear-gradient(135deg, ${color}06 0%, transparent 100%)` }}>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-white">{res.name}</span>
                          <div className="flex items-center gap-2">
                            {idx === 0 && benchResults.length > 1 && (
                              <span className="flex items-center gap-1 text-[8px] font-black text-amber-400">
                                <Trophy className="w-3 h-3" /> FASTEST
                              </span>
                            )}
                            <span className="text-[10px] font-black font-mono" style={{ color }}>
                              {res.avgTps} tok/s avg
                            </span>
                          </div>
                        </div>

                        {/* TPS bar */}
                        <div>
                          <div className="flex justify-between text-[8px] font-mono text-white/30 mb-1">
                            <span>TPS (tokens/sec)</span>
                            <span>min {res.minTps} — max {res.maxTps}</span>
                          </div>
                          <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
                            <motion.div
                              initial={{ width: 0 }} animate={{ width: `${(res.avgTps / maxTps) * 100}%` }}
                              transition={{ duration: 0.8 }}
                              className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${color}cc 0%, ${color} 100%)` }} />
                          </div>
                        </div>

                        {/* Stats grid */}
                        <div className="grid grid-cols-4 gap-2">
                          {[
                            { label: "AVG TPS", value: `${res.avgTps}`, icon: <TrendingUp className="w-2.5 h-2.5" /> },
                            { label: "AVG TTFT", value: `${res.avgTtft}ms`, icon: <Timer className="w-2.5 h-2.5" /> },
                            { label: "RUNS", value: `${res.runs.length}`, icon: <FlaskConical className="w-2.5 h-2.5" /> },
                            { label: "CONSISTENCY", value: res.maxTps > 0 ? `${Math.round((1 - (res.maxTps - res.minTps) / res.maxTps) * 100)}%` : "N/A", icon: <Activity className="w-2.5 h-2.5" /> },
                          ].map(s => (
                            <div key={s.label} className="rounded-lg p-2 text-center"
                              style={{ background: `${color}08`, border: `1px solid ${color}18` }}>
                              <div className="flex justify-center mb-0.5" style={{ color }}>
                                {s.icon}
                              </div>
                              <div className="text-[11px] font-black font-mono" style={{ color }}>{s.value}</div>
                              <div className="text-[7px] font-mono text-white/25 tracking-wider">{s.label}</div>
                            </div>
                          ))}
                        </div>

                        {/* Per-run details */}
                        <details className="group">
                          <summary className="text-[9px] font-mono text-white/25 cursor-pointer hover:text-white/50 transition-colors">
                            Per-run details ▶
                          </summary>
                          <div className="mt-2 space-y-1">
                            {res.runs.map((r, ri) => (
                              <div key={ri} className="flex gap-3 text-[8px] font-mono">
                                <span className="text-white/30">Run {ri + 1}</span>
                                <span style={{ color }}>TPS: {r.tps}</span>
                                <span className="text-white/30">TTFT: {r.ttft}ms</span>
                                <span className="text-white/25">Total: {r.totalMs}ms</span>
                                <span className="text-white/20">Tokens: ~{r.tokens}</span>
                              </div>
                            ))}
                          </div>
                        </details>
                      </motion.div>
                    );
                  })}

                  {/* Comparison bar */}
                  {benchResults.length > 1 && (
                    <div className="rounded-xl border border-violet-700/25 bg-violet-950/10 p-4">
                      <div className="text-[9px] font-mono text-violet-400/50 tracking-widest mb-3">SIDE-BY-SIDE TPS COMPARISON</div>
                      <div className="space-y-2">
                        {[...benchResults].sort((a, b) => b.avgTps - a.avgTps).map((res, i) => {
                          const color = REPLIT_MODELS.find(r => r.name === res.name)?.color ?? "#00e5ff";
                          const maxT  = benchResults[0]?.avgTps ?? 1;
                          return (
                            <div key={res.name} className="flex items-center gap-2">
                              <div className="w-4 text-[8px] font-black text-white/30">#{i+1}</div>
                              <div className="w-24 text-[9px] font-mono text-white/40 truncate">{res.name.split(":")[0]}</div>
                              <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
                                <motion.div initial={{ width: 0 }} animate={{ width: `${(res.avgTps / (maxT || 1)) * 100}%` }}
                                  transition={{ delay: i * 0.1, duration: 0.7 }}
                                  className="h-full rounded-full" style={{ backgroundColor: color }} />
                              </div>
                              <div className="w-14 text-right text-[9px] font-mono font-bold" style={{ color }}>{res.avgTps} t/s</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ═══ COMPARE TAB — Maximum Live 3D Race ═══ */}
          {tab === "compare" && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">

              {/* Header */}
              <div className="relative rounded-[18px] border overflow-hidden p-4"
                style={{ borderColor: "rgba(244,63,94,0.25)", background: "linear-gradient(135deg, rgba(244,63,94,0.07) 0%, rgba(167,139,250,0.05) 100%)" }}>
                <motion.div animate={{ opacity: [0.1, 0.25, 0.1] }} transition={{ repeat: Infinity, duration: 3 }}
                  className="absolute inset-0 pointer-events-none"
                  style={{ background: "radial-gradient(ellipse at top left, rgba(244,63,94,0.18) 0%, transparent 60%)" }} />
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(244,63,94,0.15)", border: "1px solid rgba(244,63,94,0.4)" }}>
                    <GitCompare className="w-4.5 h-4.5 text-rose-400" />
                  </div>
                  <div>
                    <div className="font-black tracking-widest text-rose-300">ARENA COMPARE</div>
                    <div className="text-[9px] font-mono text-rose-700/60 tracking-widest">LIVE TPS RACE — PARALLEL STREAMING</div>
                  </div>
                  {cmpWinner && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300 }}
                      className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black"
                      style={{
                        background: cmpWinner === "tie" ? "rgba(251,191,36,0.15)" : cmpWinner === "A" ? "rgba(244,63,94,0.2)" : "rgba(167,139,250,0.2)",
                        color: cmpWinner === "tie" ? "#fbbf24" : cmpWinner === "A" ? "#f43f5e" : "#a78bfa",
                        border: `1px solid ${cmpWinner === "tie" ? "rgba(251,191,36,0.4)" : cmpWinner === "A" ? "rgba(244,63,94,0.4)" : "rgba(167,139,250,0.4)"}`,
                      }}>
                      <Trophy className="w-3 h-3" />
                      {cmpWinner === "tie" ? "TIE" : `MODEL ${cmpWinner} WINS`}
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Config */}
              <div className="rounded-xl border border-rose-800/20 bg-rose-950/08 p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {(["A", "B"] as const).map(side => (
                    <div key={side} className="space-y-1">
                      <label className="text-[9px] font-mono tracking-widest" style={{ color: side === "A" ? "rgba(244,63,94,0.6)" : "rgba(167,139,250,0.6)" }}>
                        MODEL {side}
                      </label>
                      <select
                        value={side === "A" ? cmpModelA : cmpModelB}
                        onChange={e => side === "A" ? setCmpModelA(e.target.value) : setCmpModelB(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg text-xs font-mono focus:outline-none"
                        style={{
                          background: "rgba(0,0,0,0.5)",
                          border: `1px solid ${side === "A" ? "rgba(244,63,94,0.3)" : "rgba(167,139,250,0.3)"}`,
                          color: side === "A" ? "#fda4af" : "#c4b5fd",
                        }}>
                        <option value="">— Select —</option>
                        {status.models.map(m => <option key={m.name} value={m.name}>{m.name}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-mono text-rose-600/40 tracking-widest">PROMPT</label>
                  <textarea
                    value={cmpPrompt} onChange={e => setCmpPrompt(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg text-xs font-mono focus:outline-none resize-none"
                    style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(244,63,94,0.25)", color: "#fda4af" }}
                  />
                </div>
                <button onClick={handleCompare}
                  disabled={cmpLoadA || cmpLoadB || (!cmpModelA && !cmpModelB) || !status.running}
                  className="w-full py-2.5 rounded-xl font-black text-xs tracking-widest transition-all hover:scale-[1.02] disabled:opacity-40 flex items-center justify-center gap-2"
                  style={{ background: "linear-gradient(135deg, #f43f5e 0%, #9333ea 100%)", color: "white" }}>
                  {(cmpLoadA || cmpLoadB)
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> RACING...</>
                    : <><Zap className="w-3.5 h-3.5" /> LAUNCH RACE</>}
                </button>
              </div>

              {/* Live race canvas */}
              {(cmpLoadA || cmpLoadB || cmpResA || cmpResB) && (
                <div className="rounded-[18px] overflow-hidden border" style={{ width: "clamp(340px, 40vw, 560px)", backdropFilter: "blur(40px)", borderColor: "rgba(244,63,94,0.2)", background: "rgba(0,0,0,0.7)" }}>
                  <div className="px-4 py-2 border-b flex items-center justify-between"
                    style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                    <div className="flex items-center gap-4 text-[9px] font-mono">
                      <span className="flex items-center gap-1" style={{ color: "#f43f5e" }}>
                        <span className="w-2 h-2 rounded-full inline-block" style={{ background: "#f43f5e" }} />
                        {cmpModelA || "A"} — {cmpTpsA} t/s
                        {cmpTtftA != null && <span className="text-white/30">TTFT {cmpTtftA}ms</span>}
                      </span>
                      <span className="flex items-center gap-1" style={{ color: "#a78bfa" }}>
                        <span className="w-2 h-2 rounded-full inline-block" style={{ background: "#a78bfa" }} />
                        {cmpModelB || "B"} — {cmpTpsB} t/s
                        {cmpTtftB != null && <span className="text-white/30">TTFT {cmpTtftB}ms</span>}
                      </span>
                    </div>
                    <div className="text-[8px] font-mono text-white/25">
                      {cmpLoadA || cmpLoadB ? "LIVE" : "DONE"}
                    </div>
                  </div>
                  <CompareRaceCanvas
                    tpsA={cmpTpsA} tpsB={cmpTpsB}
                    tokensA={cmpTokensA} tokensB={cmpTokensB}
                    loadA={cmpLoadA} loadB={cmpLoadB}
                    doneA={cmpDoneA} doneB={cmpDoneB}
                    ttftA={cmpTtftA} ttftB={cmpTtftB}
                  />
                </div>
              )}

              {/* Live metrics grid */}
              {(cmpLoadA || cmpLoadB || cmpDoneA || cmpDoneB) && (
                <div className="grid grid-cols-2 gap-3">
                  {([
                    { side: "A" as const, model: cmpModelA, res: cmpResA, load: cmpLoadA, done: cmpDoneA, tps: cmpTpsA, tokens: cmpTokensA, ttft: cmpTtftA, elapsed: cmpElapsedA, color: "#f43f5e" },
                    { side: "B" as const, model: cmpModelB, res: cmpResB, load: cmpLoadB, done: cmpDoneB, tps: cmpTpsB, tokens: cmpTokensB, ttft: cmpTtftB, elapsed: cmpElapsedB, color: "#a78bfa" },
                  ]).map(({ side, model, res, load, done, tps, tokens, ttft, elapsed, color }) => (
                    <motion.div key={side}
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      className="rounded-[18px] border overflow-hidden flex flex-col"
                      style={{ borderColor: `${color}25`, background: `${color}06` }}>
                      {/* Header */}
                      <div className="flex items-center justify-between px-3 py-2 border-b"
                        style={{ borderColor: `${color}20`, background: `${color}10` }}>
                        <div className="flex items-center gap-1.5">
                          {load
                            ? <Loader2 className="w-3 h-3 animate-spin" style={{ color }} />
                            : done
                              ? <CheckCircle2 className="w-3 h-3" style={{ color }} />
                              : <div className="w-2 h-2 rounded-full" style={{ background: color, opacity: 0.4 }} />}
                          <span className="text-[10px] font-bold truncate" style={{ color }}>
                            {model || `Model ${side}`}
                          </span>
                        </div>
                        {res && (
                          <button onClick={async () => {
                            await navigator.clipboard.writeText(res);
                            setCmpCopied(side);
                            setTimeout(() => setCmpCopied(null), 1500);
                          }} className="p-1 rounded text-white/30 hover:text-white/70 transition-colors">
                            {cmpCopied === side ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          </button>
                        )}
                      </div>

                      {/* Live stats row */}
                      {(load || done) && (
                        <div className="grid grid-cols-3 gap-0 border-b" style={{ borderColor: `${color}12` }}>
                          {[
                            { label: "TPS", value: tps },
                            { label: "TOKENS", value: tokens },
                            { label: ttft != null ? `TTFT` : "TIME", value: ttft != null ? `${ttft}ms` : `${(elapsed / 1000).toFixed(1)}s` },
                          ].map(s => (
                            <div key={s.label} className="px-2 py-1.5 text-center border-r last:border-r-0" style={{ borderColor: `${color}10` }}>
                              <div className="text-[11px] font-black font-mono" style={{ color }}>{s.value}</div>
                              <div className="text-[7px] font-mono text-white/25">{s.label}</div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Response text */}
                      <div className="flex-1 p-3 text-[10px] font-mono text-white/70 leading-relaxed min-h-[100px] max-h-52 overflow-y-auto whitespace-pre-wrap">
                        {res || (load
                          ? <span className="animate-pulse" style={{ color }}>Streaming...</span>
                          : <span className="text-white/20 italic">Awaiting...</span>)}
                        {load && <span className="animate-pulse" style={{ color }}>▊</span>}
                      </div>

                      {/* Footer stats */}
                      {res && (
                        <div className="px-3 py-1.5 border-t flex gap-3 text-[8px] font-mono"
                          style={{ borderColor: `${color}15`, color: `${color}50` }}>
                          <span>{res.split(/\s+/).filter(Boolean).length} words</span>
                          <span>{res.length} chars</span>
                          {done && elapsed > 0 && <span>{(elapsed / 1000).toFixed(1)}s total</span>}
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}

              {status.models.length < 2 && !cmpLoadA && !cmpLoadB && !cmpResA && !cmpResB && (
                <div className="text-center py-10 text-white/25 text-sm font-mono">
                  Install ≥ 2 models from the Library tab to race them
                </div>
              )}
            </div>
          )}

          {/* ═══ HISTORY TAB ═══ */}
          {tab === "history" && (
            <BenchmarkHistory3D className="flex-1" />
          )}
        </div>
      </div>

      {/* ── Corner decorations ──────────────────────────────── */}
      <div className="pointer-events-none absolute top-0 left-0 w-24 h-24 z-0"
        style={{ background: "radial-gradient(circle at top left, rgba(124,58,237,0.08) 0%, transparent 70%)" }} />
      <div className="pointer-events-none absolute bottom-0 right-0 w-32 h-32 z-0"
        style={{ background: "radial-gradient(circle at bottom right, rgba(0,229,255,0.06) 0%, transparent 70%)" }} />
    </motion.div>
  );
}
