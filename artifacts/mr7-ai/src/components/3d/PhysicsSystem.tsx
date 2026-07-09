/**
 * Physics System — فيزياء واقعية
 * جاذبية + تصادم + جسيمات مغناطيسية + موجات صدمة
 */
import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { getQualityLevel } from "../../lib/adaptive-quality";

// ── Gravity Particle System ────────────────────────────────────────────────
const gravVert = `
  attribute vec3  vel;
  attribute vec3  acc;
  attribute float mass;
  attribute vec3  pColor;
  varying   vec3  vColor;
  varying   float vAlpha;
  uniform   float time;
  uniform   float pixelRatio;
  uniform   vec3  attractors[4];

  void main() {
    vColor = pColor;
    vec3 pos = position;

    // Accumulate gravitational pull from attractors
    vec3 totalForce = vec3(0.0);
    for(int i = 0; i < 4; i++) {
      vec3  dir  = attractors[i] - pos;
      float dist = max(length(dir), 0.5);
      totalForce += normalize(dir) * (1.0 / (dist * dist)) * 0.8;
    }

    // Euler integration (approximate — GPU doesn't store state)
    float dt = 0.016;
    vec3 v = vel + totalForce * dt / mass;
    pos += v * time * 0.1;

    // Boundary wrap
    pos = mod(pos + 8.0, 16.0) - 8.0;

    float dist2 = length(pos);
    vAlpha = smoothstep(8.0, 2.0, dist2) * 0.7;

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    float pulse = sin(time * 2.0 + mass * 10.0) * 0.3 + 0.7;
    gl_PointSize = (1.5 + mass * 0.5) * pixelRatio * pulse * (300.0 / -mv.z);
    gl_Position  = projectionMatrix * mv;
  }
`;

const gravFrag = `
  varying vec3  vColor;
  varying float vAlpha;
  void main() {
    vec2  uv = gl_PointCoord - 0.5;
    float d  = length(uv);
    if(d > 0.5) discard;
    float a = (1.0 - d * 2.0) * vAlpha;
    gl_FragColor = vec4(vColor, a);
  }
`;

export function GravityParticles({ count = 600 }: { count?: number }) {
  const ref    = useRef<THREE.Points>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const data = useMemo(() => {
    const pos    = new Float32Array(count * 3);
    const vel    = new Float32Array(count * 3);
    const acc    = new Float32Array(count * 3);
    const masses = new Float32Array(count);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const r = 2 + Math.random() * 6;
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(Math.random() * 2 - 1);
      pos[i*3]   = r * Math.sin(phi) * Math.cos(theta);
      pos[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i*3+2] = r * Math.cos(phi);

      // Orbital velocity (tangent to radius)
      const speed = 0.02 + Math.random() * 0.04;
      vel[i*3]   = -pos[i*3+1] * speed;
      vel[i*3+1] =  pos[i*3]   * speed;
      vel[i*3+2] = (Math.random() - 0.5) * speed;

      masses[i]   = 0.5 + Math.random() * 2.0;

      const t = Math.random();
      colors[i*3]   = 0.886 * (1-t);
      colors[i*3+1] = 0.071 * (1-t) + 0.898 * t;
      colors[i*3+2] = 0.153 * (1-t) + 1.0   * t;
    }
    return { pos, vel, acc, masses, colors };
  }, [count]);

  const attractors = useMemo(() => [
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(3, 0, 0),
    new THREE.Vector3(-3, 0, 0),
    new THREE.Vector3(0, 3, 0),
  ], []);

  const uniforms = useMemo(() => ({
    time:       { value: 0 },
    pixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
    attractors: { value: attractors },
  }), [attractors]);

  useFrame((state) => {
    if (!matRef.current) return;
    matRef.current.uniforms.time.value = state.clock.elapsedTime;

    // Animate attractors
    const t = state.clock.elapsedTime * 0.3;
    attractors[1].set(Math.sin(t) * 3, Math.cos(t * 0.7) * 2, 0);
    attractors[2].set(Math.cos(t * 0.8) * -3, Math.sin(t * 1.1) * 2, 0);
    attractors[3].set(0, Math.sin(t * 0.5) * 3, Math.cos(t * 0.6) * 2);
    matRef.current.uniforms.attractors.value = [...attractors];
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[data.pos,    3]} />
        <bufferAttribute attach="attributes-vel"      args={[data.vel,    3]} />
        <bufferAttribute attach="attributes-acc"      args={[data.acc,    3]} />
        <bufferAttribute attach="attributes-mass"     args={[data.masses, 1]} />
        <bufferAttribute attach="attributes-pColor"   args={[data.colors, 3]} />
      </bufferGeometry>
      <shaderMaterial
        ref={matRef}
        vertexShader={gravVert}
        fragmentShader={gravFrag}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// ── Shockwave Ring ─────────────────────────────────────────────────────────
const shockVert = `
  uniform float time;
  uniform float speed;
  uniform float delay;
  varying float vAlpha;
  varying vec2  vUv;

  void main() {
    vUv = uv;
    float t = mod(time * speed + delay, 3.0);
    float scale = t * 5.0 + 0.1;
    vAlpha = (1.0 - t / 3.0) * (1.0 - t / 3.0);
    vec3 pos = position * scale;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const shockFrag = `
  uniform vec3  color;
  varying float vAlpha;
  varying vec2  vUv;

  void main() {
    vec2  uv   = vUv - 0.5;
    float ring = abs(length(uv) - 0.45);
    float a    = smoothstep(0.05, 0.0, ring) * vAlpha;
    gl_FragColor = vec4(color, a * 0.6);
  }
`;

export function ShockwaveRing({ color, delay = 0, speed = 0.4 }: {
  color: THREE.Color;
  delay?: number;
  speed?: number;
}) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(() => ({
    time:  { value: 0 },
    speed: { value: speed },
    delay: { value: delay },
    color: { value: color },
  }), [color, delay, speed]);

  useFrame((state) => {
    if (!matRef.current) return;
    matRef.current.uniforms.time.value = state.clock.elapsedTime;
  });

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[1, 1, 1, 1]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={shockVert}
        fragmentShader={shockFrag}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// ── Lightning Bolt (برق ديناميكي) ─────────────────────────────────────────
function randomSegment(
  from: THREE.Vector3,
  to: THREE.Vector3,
  depth: number,
  out: number[]
) {
  if (depth === 0) {
    out.push(from.x, from.y, from.z, to.x, to.y, to.z);
    return;
  }
  const mid = from.clone().lerp(to, 0.5);
  mid.x += (Math.random() - 0.5) * 0.4 * depth;
  mid.y += (Math.random() - 0.5) * 0.4 * depth;
  mid.z += (Math.random() - 0.5) * 0.4 * depth;
  randomSegment(from, mid, depth - 1, out);
  randomSegment(mid, to, depth - 1, out);
}

export function LightningBolt({ from, to, color }: {
  from: THREE.Vector3;
  to: THREE.Vector3;
  color: THREE.Color;
}) {
  const ref      = useRef<THREE.LineSegments>(null);
  const matRef   = useRef<THREE.LineBasicMaterial>(null);
  const timerRef = useRef(0);
  const REGEN_MS = 0.12;

  useFrame((state, delta) => {
    timerRef.current += delta;
    if (timerRef.current < REGEN_MS) return;
    timerRef.current = 0;

    if (!ref.current) return;
    const pts: number[] = [];
    randomSegment(from, to, 4, pts);
    const geo  = ref.current.geometry;
    const attr = geo.attributes.position as THREE.BufferAttribute;
    const arr  = attr.array as Float32Array;
    const len  = Math.min(pts.length, arr.length);
    for (let i = 0; i < len; i++) arr[i] = pts[i];
    attr.needsUpdate = true;
    geo.setDrawRange(0, len / 3);

    // Random flicker
    if (matRef.current) {
      matRef.current.opacity = 0.4 + Math.random() * 0.6;
    }
  });

  const maxPts = new Float32Array(512 * 6);

  return (
    <lineSegments ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[maxPts, 3]} count={512 * 2} />
      </bufferGeometry>
      <lineBasicMaterial
        ref={matRef}
        color={color}
        transparent
        opacity={0.7}
        blending={THREE.AdditiveBlending}
      />
    </lineSegments>
  );
}

// ── Magnetic Attractor Visualizer ──────────────────────────────────────────
const magVert = `
  attribute float lineProgress;
  varying   float vProgress;
  uniform   float time;

  void main() {
    vProgress = lineProgress;
    vec3 pos = position;
    float wave = sin(pos.x * 3.0 + time * 2.0) * 0.05;
    pos.y += wave;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const magFrag = `
  varying float vProgress;
  uniform vec3  colorA;
  uniform vec3  colorB;
  uniform float time;

  void main() {
    float t     = mod(vProgress - time * 0.3, 1.0);
    vec3  col   = mix(colorA, colorB, vProgress);
    float alpha = sin(t * 3.14159) * 0.5;
    gl_FragColor = vec4(col, alpha);
  }
`;

export function MagneticFieldLines({ count = 16 }: { count?: number }) {
  const groupRef = useRef<THREE.Group>(null);

  const lines = useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      const phi     = (i / count) * Math.PI * 2;
      const pts     = 80;
      const pos     = new Float32Array(pts * 3);
      const progress= new Float32Array(pts);
      for (let j = 0; j < pts; j++) {
        const t  = j / (pts - 1);
        const r  = 1.5 + Math.sin(t * Math.PI * 3) * 1.5;
        const a  = phi + t * Math.PI * 2;
        pos[j*3]   = Math.cos(a) * r;
        pos[j*3+1] = Math.cos(t * Math.PI * 2) * 2;
        pos[j*3+2] = Math.sin(a) * r;
        progress[j] = t;
      }
      return { pos, progress };
    });
  }, [count]);

  const matsRef = useRef<THREE.ShaderMaterial[]>([]);

  useFrame((state) => {
    matsRef.current.forEach(m => {
      if (m) m.uniforms.time.value = state.clock.elapsedTime;
    });
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.003;
    }
  });

  return (
    <group ref={groupRef}>
      {lines.map((line, i) => {
        const uniforms = {
          time:   { value: 0 },
          colorA: { value: new THREE.Color("#e21227") },
          colorB: { value: new THREE.Color("#00e5ff") },
        };
        return (
          <line_ key={i}>
            <bufferGeometry>
              <bufferAttribute attach="attributes-position"     args={[line.pos,      3]} />
              <bufferAttribute attach="attributes-lineProgress" args={[line.progress, 1]} />
            </bufferGeometry>
            <shaderMaterial
              ref={(m) => { if (m) matsRef.current[i] = m; }}
              vertexShader={magVert}
              fragmentShader={magFrag}
              uniforms={uniforms}
              transparent
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </line_>
        );
      })}
    </group>
  );
}

// ── Composite Physics Layer ────────────────────────────────────────────────
export function PhysicsLayer() {
  const quality = getQualityLevel();
  const isHigh  = quality === "high";
  const isMed   = quality !== "low";

  const PRIMARY  = new THREE.Color("#e21227");
  const CYAN     = new THREE.Color("#00e5ff");
  const PURPLE   = new THREE.Color("#7c3aed");

  return (
    <>
      {/* Gravity particles */}
      <GravityParticles count={isHigh ? 800 : isMed ? 400 : 150} />

      {/* Shockwave rings */}
      <ShockwaveRing color={PRIMARY} delay={0}    speed={0.35} />
      <ShockwaveRing color={CYAN}    delay={1.0}  speed={0.28} />
      {isHigh && <ShockwaveRing color={PURPLE} delay={2.0} speed={0.42} />}

      {/* Lightning between nodes */}
      {isHigh && (
        <>
          <LightningBolt
            from={new THREE.Vector3(-3, 2, 0)}
            to={new THREE.Vector3(3, -2, 1)}
            color={CYAN}
          />
          <LightningBolt
            from={new THREE.Vector3(0, 3, -2)}
            to={new THREE.Vector3(-2, -1, 2)}
            color={PRIMARY}
          />
        </>
      )}

      {/* Magnetic field lines */}
      {isMed && <MagneticFieldLines count={isHigh ? 24 : 10} />}
    </>
  );
}
