/**
 * Photorealistic Particle System
 * جسيمات فوتوريالية عالية الجودة مع فيزياء واقعية
 * - جسيمات نجمية (Starfield)
 * - جسيمات بيانات متطايرة (Data Streams)
 * - جسيمات مغناطيسية (Magnetic Field)
 */
import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { getQualityLevel } from "../../lib/adaptive-quality";

// ── Starfield (حقل نجوم واقعي) ────────────────────────────────────────────
const starVert = `
  attribute float starSize;
  attribute float twinkle;
  attribute vec3  starColor;
  varying   vec3  vColor;
  varying   float vTwinkle;
  uniform   float time;
  uniform   float pixelRatio;

  void main() {
    vColor   = starColor;
    vTwinkle = twinkle;
    float t  = sin(time * twinkle * 2.0 + position.x * 10.0) * 0.5 + 0.5;
    vec4 mv  = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = starSize * pixelRatio * (0.5 + t * 0.5) * (600.0 / -mv.z);
    gl_Position  = projectionMatrix * mv;
  }
`;

const starFrag = `
  varying vec3  vColor;
  varying float vTwinkle;
  uniform float time;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if(d > 0.5) discard;

    // Soft glow core
    float core  = exp(-d * 12.0);
    float glow  = exp(-d * 4.0) * 0.4;
    float spike = exp(-abs(uv.x) * 20.0) * exp(-abs(uv.y) * 20.0) * 0.3;

    float bright = core + glow + spike;
    float twinkleAnim = sin(time * vTwinkle * 3.0) * 0.2 + 0.8;
    gl_FragColor = vec4(vColor * bright * twinkleAnim, bright * twinkleAnim);
  }
`;

export function Starfield({ count = 2000 }: { count?: number }) {
  const ref    = useRef<THREE.Points>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const data = useMemo(() => {
    const pos     = new Float32Array(count * 3);
    const sizes   = new Float32Array(count);
    const twinkle = new Float32Array(count);
    const colors  = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const r = 20 + Math.random() * 30;
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(Math.random() * 2 - 1);
      pos[i*3]   = r * Math.sin(phi) * Math.cos(theta);
      pos[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i*3+2] = r * Math.cos(phi);
      sizes[i]   = 0.5 + Math.random() * 2.0;
      twinkle[i] = 0.3 + Math.random() * 3.0;

      // Star color temperature (cool blue to warm white to red giant)
      const temp = Math.random();
      if (temp < 0.1)       { colors[i*3]=0.886; colors[i*3+1]=0.071; colors[i*3+2]=0.153; } // Red
      else if (temp < 0.3)  { colors[i*3]=1.0;   colors[i*3+1]=0.7;   colors[i*3+2]=0.3; }   // Orange
      else if (temp < 0.6)  { colors[i*3]=1.0;   colors[i*3+1]=1.0;   colors[i*3+2]=0.9; }   // White
      else                  { colors[i*3]=0.6;   colors[i*3+1]=0.8;   colors[i*3+2]=1.0; }   // Blue
    }
    return { pos, sizes, twinkle, colors };
  }, [count]);

  const uniforms = useMemo(() => ({
    time:       { value: 0 },
    pixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
  }), []);

  useFrame((state) => {
    if (!matRef.current) return;
    matRef.current.uniforms.time.value = state.clock.elapsedTime;
    if (ref.current) ref.current.rotation.y += 0.00005;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position"  args={[data.pos,    3]} />
        <bufferAttribute attach="attributes-starSize"  args={[data.sizes,  1]} />
        <bufferAttribute attach="attributes-twinkle"   args={[data.twinkle,1]} />
        <bufferAttribute attach="attributes-starColor" args={[data.colors, 3]} />
      </bufferGeometry>
      <shaderMaterial
        ref={matRef}
        vertexShader={starVert}
        fragmentShader={starFrag}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// ── Data Stream Particles (جسيمات بيانات متطايرة) ─────────────────────────
const dataVert = `
  attribute float speed;
  attribute float phase;
  attribute vec3  dataColor;
  varying   vec3  vColor;
  varying   float vAlpha;
  uniform   float time;
  uniform   float pixelRatio;

  void main() {
    vColor = dataColor;
    vec3 pos = position;

    // Stream upward and reset
    float t = mod(time * speed + phase, 12.0);
    pos.y = pos.y + t - 6.0;

    // Fade at top and bottom
    float fadeY = smoothstep(-6.0, -4.0, pos.y) * smoothstep(6.0, 4.0, pos.y);
    float pulse = sin(time * speed * 4.0 + phase * 6.28) * 0.3 + 0.7;
    vAlpha = fadeY * pulse;

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = 2.0 * pixelRatio * (200.0 / -mv.z);
    gl_Position  = projectionMatrix * mv;
  }
`;

const dataFrag = `
  varying vec3  vColor;
  varying float vAlpha;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if(d > 0.5) discard;
    float a = (1.0 - d * 2.0) * vAlpha;
    gl_FragColor = vec4(vColor, a);
  }
`;

export function DataStreamParticles({ count = 500 }: { count?: number }) {
  const ref    = useRef<THREE.Points>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const data = useMemo(() => {
    const pos    = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    const phases = new Float32Array(count);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      // Spread in circular columns around center
      const col = Math.floor(i / 5);
      const angle = (col / (count / 5)) * Math.PI * 2;
      const r = 3 + Math.random() * 5;
      pos[i*3]   = Math.cos(angle) * r + (Math.random() - 0.5) * 0.5;
      pos[i*3+1] = (Math.random() - 0.5) * 12;
      pos[i*3+2] = Math.sin(angle) * r + (Math.random() - 0.5) * 0.5;
      speeds[i]  = 0.3 + Math.random() * 0.7;
      phases[i]  = Math.random() * 12;

      // Red / cyan color mix
      const t = Math.random();
      colors[i*3]   = 0.886 * (1 - t);
      colors[i*3+1] = 0.071 * (1 - t) + 0.898 * t;
      colors[i*3+2] = 0.153 * (1 - t) + 1.0 * t;
    }
    return { pos, speeds, phases, colors };
  }, [count]);

  const uniforms = useMemo(() => ({
    time:       { value: 0 },
    pixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
  }), []);

  useFrame((state) => {
    if (!matRef.current) return;
    matRef.current.uniforms.time.value = state.clock.elapsedTime;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position"  args={[data.pos,    3]} />
        <bufferAttribute attach="attributes-speed"     args={[data.speeds, 1]} />
        <bufferAttribute attach="attributes-phase"     args={[data.phases, 1]} />
        <bufferAttribute attach="attributes-dataColor" args={[data.colors, 3]} />
      </bufferGeometry>
      <shaderMaterial
        ref={matRef}
        vertexShader={dataVert}
        fragmentShader={dataFrag}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// ── Magnetic Field Lines (خطوط المجال المغناطيسي) ─────────────────────────
export function MagneticField({ lineCount = 20 }: { lineCount?: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const lines    = useRef<THREE.LineSegments[]>([]);

  const data = useMemo(() => {
    const allPositions: Float32Array[] = [];
    for (let l = 0; l < lineCount; l++) {
      const points = 60;
      const pos = new Float32Array(points * 3);
      const phi  = (l / lineCount) * Math.PI * 2;
      for (let i = 0; i < points; i++) {
        const t = (i / (points - 1)) * Math.PI * 2;
        const r = 2 + Math.sin(t * 2 + phi) * 1.5;
        pos[i*3]   = Math.cos(t + phi) * r;
        pos[i*3+1] = Math.sin(t * 1.5) * 2;
        pos[i*3+2] = Math.sin(t + phi) * r;
      }
      allPositions.push(pos);
    }
    return allPositions;
  }, [lineCount]);

  useFrame((state) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y = state.clock.elapsedTime * 0.05;
    groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.08) * 0.1;
  });

  return (
    <group ref={groupRef}>
      {data.map((pos, i) => (
        <lineSegments key={i}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[pos, 3]} />
          </bufferGeometry>
          <lineBasicMaterial
            color={i % 2 === 0 ? "#e21227" : "#00e5ff"}
            transparent
            opacity={0.08}
          />
        </lineSegments>
      ))}
    </group>
  );
}

// ── Composite: All photorealistic particles ───────────────────────────────
export function PhotorealisticParticles() {
  const quality  = getQualityLevel();
  const isHigh   = quality === "high";
  const isMed    = quality !== "low";

  return (
    <>
      <Starfield count={isHigh ? 3000 : isMed ? 1500 : 500} />
      {isMed && <DataStreamParticles count={isHigh ? 800 : 300} />}
      {isHigh && <MagneticField lineCount={30} />}
      {isMed && !isHigh && <MagneticField lineCount={12} />}
    </>
  );
}
