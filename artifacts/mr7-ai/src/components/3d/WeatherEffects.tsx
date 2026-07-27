/**
 * Weather Effects — مؤثرات الطقس
 * ضباب حجمي + مطر ثقيل + برق + ثلج سيبراني + رياح
 */
import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { getQualityLevel } from "../../lib/adaptive-quality";

// ── Heavy Rain (مطر ثقيل مع تأثير ارتطام) ─────────────────────────────────
const heavyRainVert = `
  attribute float spd;
  attribute float len;
  attribute float opa;
  varying   float vOpa;
  varying   float vLen;
  uniform   float time;
  uniform   vec3  wind;

  void main() {
    vOpa = opa;
    vLen = len;
    vec3 pos = position;

    // Fall with wind drift
    float t = mod(time * spd + opa * 10.0, 22.0);
    pos.y  = pos.y - t + 11.0;
    pos.x += wind.x * t * 0.05;
    pos.z += wind.z * t * 0.03;

    float fade = smoothstep(-11.0, -8.0, pos.y) * smoothstep(11.0, 8.0, pos.y);
    vOpa = opa * fade;

    gl_PointSize = 1.2;
    gl_Position  = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const heavyRainFrag = `
  varying float vOpa;
  varying float vLen;
  void main() {
    gl_FragColor = vec4(0.55, 0.75, 0.95, vOpa * 0.35);
  }
`;

export function HeavyRain({ count = 5000 }: { count?: number }) {
  const ref    = useRef<THREE.Points>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const data = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const spd = new Float32Array(count);
    const len = new Float32Array(count);
    const opa = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i*3]   = (Math.random() - 0.5) * 24;
      pos[i*3+1] = (Math.random() - 0.5) * 22;
      pos[i*3+2] = (Math.random() - 0.5) * 12 - 2;
      spd[i]     = 1.2 + Math.random() * 2.0;
      len[i]     = 0.1 + Math.random() * 0.3;
      opa[i]     = 0.3 + Math.random() * 0.7;
    }
    return { pos, spd, len, opa };
  }, [count]);

  const windRef = useRef(new THREE.Vector3(0.3, 0, 0.1));

  const uniforms = useMemo(() => ({
    time: { value: 0 },
    wind: { value: windRef.current },
  }), []);

  useFrame((state) => {
    if (!matRef.current) return;
    matRef.current.uniforms.time.value = state.clock.elapsedTime;
    // Animate wind gust
    const t = state.clock.elapsedTime * 0.2;
    windRef.current.x = Math.sin(t) * 0.5;
    windRef.current.z = Math.cos(t * 0.7) * 0.2;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[data.pos, 3]} />
        <bufferAttribute attach="attributes-spd"      args={[data.spd, 1]} />
        <bufferAttribute attach="attributes-len"      args={[data.len, 1]} />
        <bufferAttribute attach="attributes-opa"      args={[data.opa, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={matRef}
        vertexShader={heavyRainVert}
        fragmentShader={heavyRainFrag}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// ── Volumetric Fog (ضباب حجمي مع تشريح ضوء) ──────────────────────────────
const fogVert = `
  varying vec3 vPos;
  void main() {
    vPos = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fogFrag = `
  uniform float time;
  uniform vec3  fogColor;
  uniform float density;
  varying vec3  vPos;

  float hash(vec3 p) {
    return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5);
  }

  float noise(vec3 p) {
    vec3 i = floor(p); vec3 f = fract(p);
    f = f*f*(3.0-2.0*f);
    return mix(
      mix(mix(hash(i),             hash(i+vec3(1,0,0)), f.x),
          mix(hash(i+vec3(0,1,0)), hash(i+vec3(1,1,0)), f.x), f.y),
      mix(mix(hash(i+vec3(0,0,1)), hash(i+vec3(1,0,1)), f.x),
          mix(hash(i+vec3(0,1,1)), hash(i+vec3(1,1,1)), f.x), f.y), f.z);
  }

  float fbm(vec3 p) {
    float v=0.0, a=0.5;
    for(int i=0;i<4;i++){ v+=a*noise(p); p=p*2.1+vec3(1.7,9.2,2.3); a*=0.5; }
    return v;
  }

  void main() {
    float f = fbm(vPos * 0.4 + vec3(time * 0.06, time * 0.04, time * 0.05));
    f = smoothstep(0.3, 0.7, f);
    float height = smoothstep(3.0, -3.0, vPos.y);
    float alpha = f * height * density;
    gl_FragColor = vec4(fogColor, alpha);
  }
`;

export function VolumetricFog({ density = 0.4 }: { density?: number }) {
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(() => ({
    time:     { value: 0 },
    fogColor: { value: new THREE.Color("#0a0020") },
    density:  { value: density },
  }), [density]);

  useFrame((state) => {
    if (!matRef.current) return;
    matRef.current.uniforms.time.value = state.clock.elapsedTime;
  });

  return (
    <mesh position={[0, -3, 0]}>
      <boxGeometry args={[20, 6, 16, 4, 4, 4]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={fogVert}
        fragmentShader={fogFrag}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={THREE.BackSide}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

// ── Cyber Snow / Data Ash (رماد بيانات سيبراني) ───────────────────────────
const snowVert = `
  attribute float snowSize;
  attribute float snowOpa;
  attribute float drift;
  varying   float vOpa;
  uniform   float time;
  uniform   float pixelRatio;

  void main() {
    vOpa = snowOpa;
    vec3 pos = position;
    float t  = mod(time * 0.1 + snowOpa * 20.0, 20.0);
    pos.y   -= t;
    pos.x   += sin(time * drift + pos.z) * 0.3;
    float fade = smoothstep(-10.0, -7.0, pos.y) * smoothstep(10.0, 7.0, pos.y);
    vOpa *= fade;
    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = snowSize * pixelRatio * (200.0 / -mv.z);
    gl_Position  = projectionMatrix * mv;
  }
`;

const snowFrag = `
  varying float vOpa;
  uniform vec3 snowColor;

  void main() {
    vec2  uv = gl_PointCoord - 0.5;
    float d  = length(uv);
    if(d > 0.5) discard;

    // Hexagonal snowflake shape approximation
    float hex = max(abs(uv.x), abs(uv.y * 1.15 + uv.x * 0.67));
    float a   = smoothstep(0.5, 0.45, d) * smoothstep(0.3, 0.35, hex) * vOpa;

    gl_FragColor = vec4(snowColor, a * 0.6);
  }
`;

export function CyberAsh({ count = 300 }: { count?: number }) {
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const data = useMemo(() => {
    const pos   = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const opas  = new Float32Array(count);
    const drift = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i*3]   = (Math.random() - 0.5) * 20;
      pos[i*3+1] = (Math.random() - 0.5) * 20;
      pos[i*3+2] = (Math.random() - 0.5) * 10;
      sizes[i]  = 1.5 + Math.random() * 3;
      opas[i]   = Math.random();
      drift[i]  = 0.3 + Math.random() * 1.5;
    }
    return { pos, sizes, opas, drift };
  }, [count]);

  const uniforms = useMemo(() => ({
    time:       { value: 0 },
    pixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
    snowColor:  { value: new THREE.Color("#00e5ff") },
  }), []);

  useFrame((state) => {
    if (!matRef.current) return;
    matRef.current.uniforms.time.value = state.clock.elapsedTime;
  });

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position"  args={[data.pos,   3]} />
        <bufferAttribute attach="attributes-snowSize"  args={[data.sizes, 1]} />
        <bufferAttribute attach="attributes-snowOpa"   args={[data.opas,  1]} />
        <bufferAttribute attach="attributes-drift"     args={[data.drift, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={matRef}
        vertexShader={snowVert}
        fragmentShader={snowFrag}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// ── Wind Streamlines (خطوط تدفق الرياح) ──────────────────────────────────
const windVert = `
  attribute float wProgress;
  attribute float wSpeed;
  varying   float vProgress;
  varying   float vSpeed;
  uniform   float time;

  void main() {
    vProgress = wProgress;
    vSpeed    = wSpeed;
    vec3 pos  = position;

    // Animate along the streamline
    float t   = mod(wProgress + time * wSpeed * 0.05, 1.0);
    float fade = sin(t * 3.14159);

    // Curl noise displacement
    float curl = sin(pos.x * 2.0 + time * 0.3) * cos(pos.z * 1.5 - time * 0.2) * 0.3;
    pos.y += curl;

    gl_PointSize = 1.5 * fade;
    gl_Position  = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const windFrag = `
  uniform float time;
  void main() {
    vec2  uv = gl_PointCoord - 0.5;
    float d  = length(uv);
    if(d > 0.5) discard;
    gl_FragColor = vec4(0.0, 0.898, 1.0, (1.0 - d * 2.0) * 0.15);
  }
`;

export function WindStreamlines({ lineCount = 40, pointsPerLine = 30 }: {
  lineCount?: number;
  pointsPerLine?: number;
}) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const count  = lineCount * pointsPerLine;

  const data = useMemo(() => {
    const pos   = new Float32Array(count * 3);
    const prog  = new Float32Array(count);
    const speed = new Float32Array(count);

    for (let l = 0; l < lineCount; l++) {
      const startX = (Math.random() - 0.5) * 14;
      const startY = (Math.random() - 0.5) * 8;
      const startZ = (Math.random() - 0.5) * 8;
      const spd    = 0.5 + Math.random();

      for (let p = 0; p < pointsPerLine; p++) {
        const idx = (l * pointsPerLine + p);
        const t   = p / (pointsPerLine - 1);
        pos[idx*3]   = startX + t * 10 - 5;
        pos[idx*3+1] = startY + Math.sin(t * Math.PI * 2 + l) * 1.5;
        pos[idx*3+2] = startZ + Math.cos(t * Math.PI + l * 0.5) * 1.0;
        prog[idx]    = t;
        speed[idx]   = spd;
      }
    }
    return { pos, prog, speed };
  }, [count, lineCount, pointsPerLine]);

  const uniforms = useMemo(() => ({ time: { value: 0 } }), []);

  useFrame((state) => {
    if (!matRef.current) return;
    matRef.current.uniforms.time.value = state.clock.elapsedTime;
  });

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position"  args={[data.pos,   3]} />
        <bufferAttribute attach="attributes-wProgress" args={[data.prog,  1]} />
        <bufferAttribute attach="attributes-wSpeed"    args={[data.speed, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={matRef}
        vertexShader={windVert}
        fragmentShader={windFrag}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// ── Composite Weather Layer ────────────────────────────────────────────────
export function WeatherLayer() {
  const quality = getQualityLevel();
  const isHigh  = quality === "high";
  const isMed   = quality !== "low";

  return (
    <>
      {/* Volumetric fog at ground level */}
      <VolumetricFog density={isHigh ? 0.5 : 0.25} />

      {/* Heavy rain */}
      {isMed && <HeavyRain count={isHigh ? 6000 : 2500} />}

      {/* Cyber ash / data snow */}
      {isMed && <CyberAsh count={isHigh ? 400 : 150} />}

      {/* Wind streamlines */}
      {isHigh && <WindStreamlines lineCount={50} pointsPerLine={35} />}
      {isMed && !isHigh && <WindStreamlines lineCount={20} pointsPerLine={20} />}
    </>
  );
}
