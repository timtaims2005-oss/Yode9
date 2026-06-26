/**
 * Space Environment — بيئة فضائية كاملة
 * سديم + كوكب هولوغرافي + مجرة + ثقب أسود
 */
import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { getQualityLevel } from "../../lib/adaptive-quality";

// ── Black Hole (ثقب أسود بتشويه فضائي) ──────────────────────────────────
const bhVert = `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`;
const bhFrag = `
  uniform float time;
  uniform vec2  resolution;
  varying vec2  vUv;

  float noise(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5); }

  void main(){
    vec2 uv = vUv - 0.5;
    float r = length(uv);
    float a = atan(uv.y, uv.x);

    // Event horizon
    float horizon = smoothstep(0.12, 0.08, r);

    // Accretion disk
    float disk = exp(-abs(uv.y) * 18.0) * smoothstep(0.1, 0.15, r) * smoothstep(0.45, 0.35, r);
    float spin = mod(a - time * 1.2, 6.28318);
    float bright = exp(-spin * 0.4) * disk;

    // Gravitational lensing distortion
    float lens = exp(-r * 4.0) * 0.3;

    // Nebula wisps
    float wisp = noise(uv * 8.0 + time * 0.1) * disk * 0.5;

    vec3 diskCol = mix(vec3(1.0, 0.4, 0.0), vec3(0.886, 0.071, 0.153), spin / 6.28318);
    diskCol = mix(diskCol, vec3(1.0, 0.9, 0.6), bright * 0.5);

    vec3 col = diskCol * (bright + wisp) + vec3(1.0) * lens;
    float alpha = (bright + wisp + lens) * (1.0 - horizon);
    alpha += horizon * 0.95;

    gl_FragColor = vec4(col * (1.0 - horizon), alpha);
  }
`;

export function BlackHole({ position, size = 2.0 }: {
  position: [number, number, number];
  size?: number;
}) {
  const matRef  = useRef<THREE.ShaderMaterial>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const { camera } = useRef<any>({ camera: null }).current ?? {};

  const uniforms = useMemo(() => ({
    time:       { value: 0 },
    resolution: { value: new THREE.Vector2(512, 512) },
  }), []);

  useFrame((state) => {
    if (!matRef.current) return;
    matRef.current.uniforms.time.value = state.clock.elapsedTime;
    if (meshRef.current) meshRef.current.quaternion.copy(state.camera.quaternion);
  });

  return (
    <mesh ref={meshRef} position={position} scale={size}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={bhVert}
        fragmentShader={bhFrag}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

// ── Galaxy Spiral (مجرة حلزونية) ─────────────────────────────────────────
const galVert = `
  attribute float galBright;
  attribute vec3  galColor;
  varying   float vBright;
  varying   vec3  vColor;
  uniform   float time;
  uniform   float pixelRatio;

  void main(){
    vBright = galBright;
    vColor  = galColor;
    float pulse = 0.7 + 0.3 * sin(time * galBright * 2.0 + position.x * 5.0);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = 1.5 * pixelRatio * pulse * galBright * (500.0 / -mv.z);
    gl_Position  = projectionMatrix * mv;
  }
`;
const galFrag = `
  varying float vBright;
  varying vec3  vColor;
  void main(){
    vec2  uv = gl_PointCoord - 0.5;
    float d  = length(uv);
    if(d > 0.5) discard;
    gl_FragColor = vec4(vColor, vBright * exp(-d * 6.0));
  }
`;

export function GalaxySpiral({ count = 4000, position }: {
  count?: number;
  position: [number, number, number];
}) {
  const ref    = useRef<THREE.Points>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const data = useMemo(() => {
    const pos     = new Float32Array(count * 3);
    const bright  = new Float32Array(count);
    const colors  = new Float32Array(count * 3);
    const ARMS    = 3;

    for (let i = 0; i < count; i++) {
      const arm    = i % ARMS;
      const t      = (i / count) * 1.5;
      const angle  = t * Math.PI * 4 + (arm / ARMS) * Math.PI * 2;
      const r      = t * 12 + (Math.random() - 0.5) * 1.5;
      const spread = (Math.random() - 0.5) * 0.6 * (1 + t);

      pos[i*3]   = Math.cos(angle) * r + spread;
      pos[i*3+1] = (Math.random() - 0.5) * 0.4 * (1 - t * 0.5);
      pos[i*3+2] = Math.sin(angle) * r + spread;

      bright[i] = (1 - t * 0.5) * (0.4 + Math.random() * 0.6);

      // Color: core = warm white, outer = blue/red
      const tc = t / 1.5;
      if (tc < 0.3) {
        colors[i*3]   = 1.0; colors[i*3+1] = 0.95; colors[i*3+2] = 0.85;
      } else if (arm === 0) {
        colors[i*3]   = 0.886; colors[i*3+1] = 0.2; colors[i*3+2] = 0.3;
      } else if (arm === 1) {
        colors[i*3]   = 0.3; colors[i*3+1] = 0.7; colors[i*3+2] = 1.0;
      } else {
        colors[i*3]   = 0.8; colors[i*3+1] = 0.5; colors[i*3+2] = 1.0;
      }
    }
    return { pos, bright, colors };
  }, [count]);

  const uniforms = useMemo(() => ({
    time:       { value: 0 },
    pixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
  }), []);

  useFrame((state) => {
    if (!matRef.current) return;
    matRef.current.uniforms.time.value = state.clock.elapsedTime;
    if (ref.current) ref.current.rotation.y += 0.0003;
  });

  return (
    <points ref={ref} position={position} scale={0.08}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position"  args={[data.pos,    3]} />
        <bufferAttribute attach="attributes-galBright" args={[data.bright, 1]} />
        <bufferAttribute attach="attributes-galColor"  args={[data.colors, 3]} />
      </bufferGeometry>
      <shaderMaterial
        ref={matRef}
        vertexShader={galVert}
        fragmentShader={galFrag}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// ── Nebula Cloud (سحابة نيبولا) ───────────────────────────────────────────
const nebVert = `
  attribute float nebSize;
  attribute float nebOpa;
  attribute vec3  nebColor;
  varying   float vOpa;
  varying   vec3  vColor;
  uniform   float time;
  uniform   float pixelRatio;
  void main(){
    vOpa  = nebOpa;
    vColor = nebColor;
    float pulse = 0.85 + 0.15 * sin(time * 0.3 + nebOpa * 20.0);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = nebSize * pixelRatio * pulse * (500.0 / -mv.z);
    gl_Position  = projectionMatrix * mv;
  }
`;
const nebFrag = `
  varying float vOpa;
  varying vec3  vColor;
  void main(){
    vec2  uv = gl_PointCoord - 0.5;
    float d  = length(uv);
    if(d > 0.5) discard;
    float a  = exp(-d * 2.5) * vOpa * 0.25;
    gl_FragColor = vec4(vColor, a);
  }
`;

export function NebulaCloud({ count = 800, position, scale = 1 }: {
  count?: number;
  position: [number, number, number];
  scale?: number;
}) {
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const data = useMemo(() => {
    const pos    = new Float32Array(count * 3);
    const sizes  = new Float32Array(count);
    const opas   = new Float32Array(count);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const r = Math.random() * 5;
      const t = Math.random() * Math.PI * 2;
      const p = Math.acos(Math.random() * 2 - 1);
      pos[i*3]   = Math.sin(p) * Math.cos(t) * r;
      pos[i*3+1] = Math.sin(p) * Math.sin(t) * r * 0.4;
      pos[i*3+2] = Math.cos(p) * r;
      sizes[i]  = 4 + Math.random() * 12;
      opas[i]   = 0.2 + Math.random() * 0.6;

      const c = Math.random();
      if (c < 0.33) {
        colors[i*3]  = 0.886; colors[i*3+1] = 0.071; colors[i*3+2] = 0.3;
      } else if (c < 0.66) {
        colors[i*3]  = 0.3;   colors[i*3+1] = 0.5;   colors[i*3+2] = 1.0;
      } else {
        colors[i*3]  = 0.6;   colors[i*3+1] = 0.1;   colors[i*3+2] = 0.9;
      }
    }
    return { pos, sizes, opas, colors };
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
    <points position={position} scale={scale}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[data.pos,    3]} />
        <bufferAttribute attach="attributes-nebSize"  args={[data.sizes,  1]} />
        <bufferAttribute attach="attributes-nebOpa"   args={[data.opas,   1]} />
        <bufferAttribute attach="attributes-nebColor" args={[data.colors, 3]} />
      </bufferGeometry>
      <shaderMaterial
        ref={matRef}
        vertexShader={nebVert}
        fragmentShader={nebFrag}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// ── Composite Space Layer ─────────────────────────────────────────────────
export function SpaceEnvironmentLayer() {
  const quality = getQualityLevel();
  const isHigh  = quality === "high";
  const isMed   = quality !== "low";

  return (
    <>
      {/* Black hole far in background */}
      {isHigh && <BlackHole position={[-12, 4, -20]} size={3.5} />}

      {/* Galaxy spirals in far background */}
      {isHigh && (
        <>
          <GalaxySpiral count={5000} position={[15, 5, -40]}   />
          <GalaxySpiral count={3000} position={[-18, -3, -35]} />
        </>
      )}
      {isMed && !isHigh && <GalaxySpiral count={2000} position={[12, 3, -30]} />}

      {/* Nebula clouds */}
      <NebulaCloud count={isHigh ? 1000 : 400} position={[8, 3, -15]}  scale={1.5} />
      <NebulaCloud count={isHigh ? 800  : 300} position={[-10, -2, -18]} scale={1.2} />
      {isHigh && <NebulaCloud count={600} position={[0, 8, -20]} scale={2.0} />}
    </>
  );
}
