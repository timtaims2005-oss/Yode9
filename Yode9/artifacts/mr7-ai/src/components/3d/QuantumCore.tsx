/**
 * Quantum Core — النواة الكمومية
 * جسيم كمومي مركزي مع تشابك + تأثير مزدوج الشق
 */
import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { getQualityLevel } from "../../lib/adaptive-quality";

// ── Quantum Entanglement Strings ──────────────────────────────────────────
const entangleVert = `
  attribute float eProgress;
  attribute float eSpeed;
  attribute vec3  eColor;
  varying   float vProgress;
  varying   vec3  vColor;
  uniform   float time;
  uniform   float pixelRatio;

  void main() {
    vProgress = eProgress;
    vColor    = eColor;
    vec3 pos  = position;

    // Quantum oscillation — position is "uncertain"
    float uncertainty = sin(time * eSpeed * 2.0 + eProgress * 20.0) * 0.06;
    pos += normalize(pos) * uncertainty;

    float pulse = 0.5 + 0.5 * sin(time * eSpeed + eProgress * 6.28318);
    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = 2.0 * pixelRatio * pulse * (300.0 / -mv.z);
    gl_Position  = projectionMatrix * mv;
  }
`;

const entangleFrag = `
  varying float vProgress;
  varying vec3  vColor;
  void main() {
    vec2  uv = gl_PointCoord - 0.5;
    float d  = length(uv);
    if(d > 0.5) discard;
    float ring1 = exp(-abs(d - 0.12) * 30.0) * 0.8;
    float core  = exp(-d * 10.0);
    gl_FragColor = vec4(vColor, (core + ring1) * 0.85);
  }
`;

// Quantum entangled particle pairs
export function QuantumEntanglement({ pairCount = 30 }: { pairCount?: number }) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const geoRef = useRef<THREE.BufferGeometry>(null);

  const data = useMemo(() => {
    const count  = pairCount * 2;
    const pos    = new Float32Array(count * 3);
    const prog   = new Float32Array(count);
    const speeds = new Float32Array(count);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < pairCount; i++) {
      // Pair A
      const r = 0.8 + Math.random() * 1.5;
      const t = Math.random() * Math.PI * 2;
      const p = Math.acos(Math.random() * 2 - 1);
      const ax = Math.sin(p) * Math.cos(t) * r;
      const ay = Math.sin(p) * Math.sin(t) * r;
      const az = Math.cos(p) * r;

      pos[i*6]   = ax; pos[i*6+1] = ay; pos[i*6+2] = az;
      pos[i*6+3] = -ax; pos[i*6+4] = -ay; pos[i*6+5] = -az; // Entangled partner (opposite)

      const spd = 0.5 + Math.random() * 1.5;
      speeds[i*2] = spd; speeds[i*2+1] = spd;
      prog[i*2]   = i / pairCount;
      prog[i*2+1] = i / pairCount + 0.5;

      const t2 = i / pairCount;
      colors[i*6]   = 0.886 * t2; colors[i*6+1] = 0.898 * (1-t2); colors[i*6+2] = 1.0;
      colors[i*6+3] = 0.886 * t2; colors[i*6+4] = 0.898 * (1-t2); colors[i*6+5] = 1.0;
    }
    return { pos, prog, speeds, colors };
  }, [pairCount]);

  const uniforms = useMemo(() => ({
    time:       { value: 0 },
    pixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
  }), []);

  useFrame((state) => {
    if (!matRef.current || !geoRef.current) return;
    matRef.current.uniforms.time.value = state.clock.elapsedTime;

    // Update positions — quantum rotation
    const t = state.clock.elapsedTime;
    const pos = geoRef.current.attributes.position as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    const pairCount2 = data.pos.length / 6;
    for (let i = 0; i < pairCount2; i++) {
      const speed = data.speeds[i*2];
      const angle = t * speed + (i / pairCount2) * Math.PI * 2;
      const r = Math.sqrt(arr[i*6]**2 + arr[i*6+1]**2 + arr[i*6+2]**2);
      arr[i*6]   = Math.cos(angle) * r * 0.7;
      arr[i*6+1] = Math.sin(angle * 0.7) * r;
      arr[i*6+2] = Math.sin(angle) * r * 0.7;
      arr[i*6+3] = -arr[i*6];
      arr[i*6+4] = -arr[i*6+1];
      arr[i*6+5] = -arr[i*6+2];
    }
    pos.needsUpdate = true;
  });

  return (
    <points>
      <bufferGeometry ref={geoRef}>
        <bufferAttribute attach="attributes-position"  args={[data.pos,    3]} />
        <bufferAttribute attach="attributes-eProgress" args={[data.prog,   1]} />
        <bufferAttribute attach="attributes-eSpeed"    args={[data.speeds, 1]} />
        <bufferAttribute attach="attributes-eColor"    args={[data.colors, 3]} />
      </bufferGeometry>
      <shaderMaterial
        ref={matRef}
        vertexShader={entangleVert}
        fragmentShader={entangleFrag}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// ── Quantum Probability Cloud ──────────────────────────────────────────────
const cloudVert = `
  attribute float cloudSize;
  attribute float cloudPhase;
  attribute vec3  cloudColor;
  varying   float vPhase;
  varying   vec3  vColor;
  uniform   float time;
  uniform   float pixelRatio;
  uniform   vec3  waveCenter;

  float rand(vec3 p){ return fract(sin(dot(p,vec3(12.9898,78.233,45.5)))* 43758.5); }

  void main(){
    vPhase = cloudPhase;
    vColor = cloudColor;

    vec3 pos = position;
    float r  = rand(pos);

    // Wave function collapse probability
    float psi = exp(-length(pos - waveCenter) * 1.2);
    psi = psi * psi; // probability density |ψ|²

    // Random tunneling based on probability
    float tunnel = sin(time * 0.8 + r * 20.0) > (1.0 - psi * 0.8) ? 1.0 : 0.0;
    if(tunnel > 0.5){
      pos.x += sin(time * r * 3.0) * 0.4;
      pos.y += cos(time * r * 2.7) * 0.4;
      pos.z += sin(time * r * 2.3 + 1.0) * 0.4;
    }

    float scale = psi * (0.5 + 0.5 * sin(time * 2.0 + cloudPhase));
    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = cloudSize * pixelRatio * scale * (300.0 / -mv.z);
    gl_Position  = projectionMatrix * mv;
  }
`;

const cloudFrag = `
  varying float vPhase;
  varying vec3  vColor;
  void main(){
    vec2  uv = gl_PointCoord - 0.5;
    float d  = length(uv);
    if(d > 0.5) discard;
    float a  = exp(-d * 5.0) * 0.6;
    gl_FragColor = vec4(vColor, a);
  }
`;

export function QuantumProbabilityCloud({ count = 500 }: { count?: number }) {
  const matRef    = useRef<THREE.ShaderMaterial>(null);
  const centerRef = useRef(new THREE.Vector3(0, 0, 0));

  const data = useMemo(() => {
    const pos    = new Float32Array(count * 3);
    const sizes  = new Float32Array(count);
    const phases = new Float32Array(count);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      // Gaussian distribution centered at origin
      const sigma = 1.5;
      const x = (Math.random() + Math.random() - 1) * sigma;
      const y = (Math.random() + Math.random() - 1) * sigma;
      const z = (Math.random() + Math.random() - 1) * sigma;
      pos[i*3] = x; pos[i*3+1] = y; pos[i*3+2] = z;
      sizes[i]   = 2 + Math.random() * 3;
      phases[i]  = Math.random() * Math.PI * 2;

      const t = i / count;
      colors[i*3]   = 0.886 * (1-t) + 0.0 * t;
      colors[i*3+1] = 0.2  * (1-t) + 0.898 * t;
      colors[i*3+2] = 1.0;
    }
    return { pos, sizes, phases, colors };
  }, [count]);

  const uniforms = useMemo(() => ({
    time:       { value: 0 },
    pixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
    waveCenter: { value: centerRef.current },
  }), []);

  useFrame((state) => {
    if (!matRef.current) return;
    const t = state.clock.elapsedTime;
    matRef.current.uniforms.time.value = t;
    // Animate wave function center (orbital motion)
    centerRef.current.set(
      Math.sin(t * 0.3) * 0.5,
      Math.cos(t * 0.4) * 0.3,
      Math.sin(t * 0.25) * 0.4,
    );
    matRef.current.uniforms.waveCenter.value = centerRef.current;
  });

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position"   args={[data.pos,    3]} />
        <bufferAttribute attach="attributes-cloudSize"  args={[data.sizes,  1]} />
        <bufferAttribute attach="attributes-cloudPhase" args={[data.phases, 1]} />
        <bufferAttribute attach="attributes-cloudColor" args={[data.colors, 3]} />
      </bufferGeometry>
      <shaderMaterial
        ref={matRef}
        vertexShader={cloudVert}
        fragmentShader={cloudFrag}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// ── Composite Quantum Core Layer ───────────────────────────────────────────
export function QuantumCoreLayer() {
  const quality = getQualityLevel();
  const isHigh  = quality === "high";
  const isMed   = quality !== "low";

  return (
    <>
      <QuantumProbabilityCloud count={isHigh ? 800 : isMed ? 300 : 100} />
      {isMed && <QuantumEntanglement pairCount={isHigh ? 60 : 25} />}
    </>
  );
}
