/**
 * Data Visualization 3D — تصور البيانات ثلاثي الأبعاد
 * رسوم بيانية حية + خرائط شبكية + تدفق البيانات
 */
import { useRef, useMemo, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Billboard, Text } from "@react-three/drei";
import * as THREE from "three";

// ── 3D DNA Helix (حلزون الـ DNA الرقمي) ──────────────────────────────────
const dnaVert = `
  attribute float dnaPhase;
  attribute vec3  dnaColor;
  varying   float vPhase;
  varying   vec3  vColor;
  uniform   float time;
  uniform   float pixelRatio;

  void main() {
    vPhase = dnaPhase;
    vColor = dnaColor;
    vec3 pos = position;

    // Animate twist
    float twist = time * 0.3 + dnaPhase;
    float r = 0.6;
    pos.x = cos(twist) * r;
    pos.z = sin(twist) * r;

    float pulse = 0.7 + 0.3 * sin(time * 2.0 + dnaPhase * 5.0);
    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = 4.0 * pixelRatio * pulse * (300.0 / -mv.z);
    gl_Position  = projectionMatrix * mv;
  }
`;

const dnaFrag = `
  varying float vPhase;
  varying vec3  vColor;
  void main() {
    vec2  uv = gl_PointCoord - 0.5;
    float d  = length(uv);
    if(d > 0.5) discard;
    float a  = exp(-d * 8.0);
    gl_FragColor = vec4(vColor, a * 0.9);
  }
`;

export function DigitalDNA({ strandLength = 60 }: { strandLength?: number }) {
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const data = useMemo(() => {
    const pos    = new Float32Array(strandLength * 2 * 3);
    const phases = new Float32Array(strandLength * 2);
    const colors = new Float32Array(strandLength * 2 * 3);

    for (let i = 0; i < strandLength; i++) {
      const y = (i / strandLength) * 6 - 3;
      const phase = (i / strandLength) * Math.PI * 4;

      // Strand A
      pos[i*6]   = Math.cos(phase);
      pos[i*6+1] = y;
      pos[i*6+2] = Math.sin(phase);
      phases[i*2] = phase;
      colors[i*6]   = 0.886; colors[i*6+1] = 0.071; colors[i*6+2] = 0.153;

      // Strand B (opposite)
      pos[i*6+3] = Math.cos(phase + Math.PI);
      pos[i*6+4] = y;
      pos[i*6+5] = Math.sin(phase + Math.PI);
      phases[i*2+1] = phase + Math.PI;
      colors[i*6+3] = 0.0; colors[i*6+4] = 0.898; colors[i*6+5] = 1.0;
    }
    return { pos, phases, colors };
  }, [strandLength]);

  const uniforms = useMemo(() => ({
    time:       { value: 0 },
    pixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
  }), []);

  useFrame((state) => {
    if (!matRef.current) return;
    matRef.current.uniforms.time.value = state.clock.elapsedTime;
  });

  return (
    <group position={[5, 0, -3]}>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[data.pos,    3]} />
          <bufferAttribute attach="attributes-dnaPhase" args={[data.phases, 1]} />
          <bufferAttribute attach="attributes-dnaColor" args={[data.colors, 3]} />
        </bufferGeometry>
        <shaderMaterial
          ref={matRef}
          vertexShader={dnaVert}
          fragmentShader={dnaFrag}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}

// ── 3D Radar Sweep ─────────────────────────────────────────────────────────
const radarVert = `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
`;
const radarFrag = `
  uniform float time;
  uniform vec3  color;
  varying vec2  vUv;

  void main() {
    vec2  uv   = vUv - 0.5;
    float dist = length(uv);
    if(dist > 0.5) discard;

    // Concentric rings
    float rings = step(0.96, fract(dist * 8.0));

    // Sweep
    float angle = atan(uv.y, uv.x);
    float sweep = mod(angle - time * 1.5, 6.28318);
    float beam  = exp(-sweep * 1.2) * (1.0 - dist * 1.5);

    // Cross hairs
    float ch = max(
      step(0.98, 1.0 - abs(uv.x) * 2.0),
      step(0.98, 1.0 - abs(uv.y) * 2.0)
    ) * 0.5;

    float alpha = (rings * 0.3 + beam * 0.7 + ch) * (1.0 - dist * 1.8);
    gl_FragColor = vec4(color, alpha * 0.7);
  }
`;

export function Radar3D({ position }: { position: [number, number, number] }) {
  const matRef  = useRef<THREE.ShaderMaterial>(null);
  const groupRef= useRef<THREE.Group>(null);
  const uniforms = useMemo(() => ({
    time:  { value: 0 },
    color: { value: new THREE.Color("#00e5ff") },
  }), []);

  // Animated blips (detected targets)
  const blips = useMemo(() => Array.from({ length: 5 }, () => ({
    angle: Math.random() * Math.PI * 2,
    dist:  0.1 + Math.random() * 0.38,
    phase: Math.random() * Math.PI * 2,
  })), []);

  useFrame((state) => {
    if (!matRef.current) return;
    matRef.current.uniforms.time.value = state.clock.elapsedTime;
    if (groupRef.current) groupRef.current.rotation.x = -Math.PI / 6;
  });

  return (
    <group ref={groupRef} position={position}>
      <mesh>
        <planeGeometry args={[2, 2]} />
        <shaderMaterial
          ref={matRef}
          vertexShader={radarVert}
          fragmentShader={radarFrag}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <Billboard position={[0, 1.2, 0]}>
        <Text fontSize={0.1} color="#00e5ff" anchorX="center">◈ THREAT RADAR</Text>
      </Billboard>
    </group>
  );
}

// ── Live Data Graph ────────────────────────────────────────────────────────
const graphVert = `
  attribute float graphVal;
  attribute float graphX;
  varying   float vVal;
  varying   float vX;
  uniform   float time;
  void main() {
    vVal = graphVal;
    vX   = graphX;
    vec3 pos = position;
    pos.y = graphVal * 2.0 - 1.0;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;
const graphFrag = `
  varying float vVal;
  varying float vX;
  uniform vec3  color;
  void main() {
    float alpha = 0.8 - vX * 0.6;
    gl_FragColor = vec4(color * (0.5 + vVal * 0.5), alpha * 0.9);
  }
`;

export function LiveGraph({
  position, width = 3, height = 1.5, color,
}: {
  position: [number, number, number];
  width?: number;
  height?: number;
  color: THREE.Color;
}) {
  const COUNT   = 80;
  const matRef  = useRef<THREE.ShaderMaterial>(null);
  const geoRef  = useRef<THREE.BufferGeometry>(null);

  const data = useMemo(() => {
    const pos   = new Float32Array(COUNT * 3);
    const vals  = new Float32Array(COUNT);
    const xs    = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      pos[i*3]   = (i / COUNT) * width - width / 2;
      pos[i*3+1] = 0;
      pos[i*3+2] = 0;
      vals[i] = 0.5;
      xs[i]   = i / COUNT;
    }
    return { pos, vals, xs };
  }, [width]);

  const uniforms = useMemo(() => ({ time: { value: 0 }, color: { value: color } }), [color]);

  useFrame((state) => {
    if (!matRef.current || !geoRef.current) return;
    matRef.current.uniforms.time.value = state.clock.elapsedTime;
    const t = state.clock.elapsedTime;

    // Shift left + add new value
    const vals = geoRef.current.attributes.graphVal as THREE.BufferAttribute;
    const arr  = vals.array as Float32Array;
    for (let i = 0; i < COUNT - 1; i++) arr[i] = arr[i + 1];
    arr[COUNT-1] = 0.3 + Math.sin(t * 4.3) * 0.2 + Math.sin(t * 7.1) * 0.15 + (Math.random() - 0.5) * 0.1;
    arr[COUNT-1] = Math.max(0, Math.min(1, arr[COUNT-1]));
    vals.needsUpdate = true;
  });

  return (
    <group position={position}>
      {/* Border frame */}
      <lineLoop>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[new Float32Array([
              -width/2, -height/2, 0,  width/2, -height/2, 0,
               width/2,  height/2, 0, -width/2,  height/2, 0,
            ]), 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial color={color} transparent opacity={0.4} />
      </lineLoop>

      {/* Graph line */}
      <line_>
        <bufferGeometry ref={geoRef}>
          <bufferAttribute attach="attributes-position"  args={[data.pos,  3]} />
          <bufferAttribute attach="attributes-graphVal"  args={[data.vals, 1]} />
          <bufferAttribute attach="attributes-graphX"    args={[data.xs,   1]} />
        </bufferGeometry>
        <shaderMaterial
          ref={matRef}
          vertexShader={graphVert}
          fragmentShader={graphFrag}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </line_>
    </group>
  );
}
