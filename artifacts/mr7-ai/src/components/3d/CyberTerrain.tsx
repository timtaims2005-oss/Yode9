/**
 * Cyber Terrain — أرضية سيبرانية ثلاثية الأبعاد
 * شبكة واير فريم مع تأثيرات توهج وموجات
 */
import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { getQualityLevel } from "../../lib/adaptive-quality";

const terrainVert = `
  uniform float time;
  uniform float amplitude;
  varying float vHeight;
  varying vec2  vUv;
  varying vec3  vPos;

  float noise(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }

  float smoothNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(noise(i), noise(i + vec2(1,0)), f.x),
      mix(noise(i + vec2(0,1)), noise(i + vec2(1,1)), f.x),
      f.y
    );
  }

  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for(int i = 0; i < 4; i++) {
      v += a * smoothNoise(p);
      p  = p * 2.1 + vec2(1.7, 9.2);
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vUv = uv;
    vec3 pos = position;

    float n = fbm(pos.xz * 0.5 + time * 0.05);
    pos.y   = n * amplitude - amplitude * 0.3;

    // Wave propagation from center
    float dist  = length(pos.xz);
    float wave  = sin(dist * 1.5 - time * 2.5) * exp(-dist * 0.15) * 0.3;
    pos.y      += wave;

    vHeight = pos.y;
    vPos    = pos;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const terrainFrag = `
  uniform float time;
  uniform vec3  lowColor;
  uniform vec3  highColor;
  varying float vHeight;
  varying vec2  vUv;
  varying vec3  vPos;

  void main() {
    float t   = clamp(vHeight * 1.5 + 0.5, 0.0, 1.0);
    vec3  col = mix(lowColor, highColor, t);

    // Grid lines
    vec2  grid  = fract(vUv * 24.0);
    float lineX = step(0.96, grid.x);
    float lineY = step(0.96, grid.y);
    float line  = max(lineX, lineY);

    // Height glow
    float glow  = t * t * 0.6;

    // Pulse from center
    float dist  = length(vPos.xz);
    float pulse = sin(dist * 1.5 - time * 2.5) * 0.5 + 0.5;
    pulse       = pulse * exp(-dist * 0.2);

    float alpha = (line * (0.4 + glow) + pulse * 0.3) * (0.3 + t * 0.5);
    gl_FragColor = vec4(col, alpha);
  }
`;

export function CyberTerrain({
  size = 24, segments = 48, amplitude = 1.2, position = [0, -5, 0] as [number,number,number],
}: {
  size?: number;
  segments?: number;
  amplitude?: number;
  position?: [number, number, number];
}) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const meshRef = useRef<THREE.Mesh>(null);

  const uniforms = useMemo(() => ({
    time:      { value: 0 },
    amplitude: { value: amplitude },
    lowColor:  { value: new THREE.Color("#e21227") },
    highColor: { value: new THREE.Color("#00e5ff") },
  }), [amplitude]);

  useFrame((state) => {
    if (!matRef.current) return;
    matRef.current.uniforms.time.value = state.clock.elapsedTime;
  });

  return (
    <mesh ref={meshRef} position={position} rotation={[0, 0, 0]}>
      <planeGeometry args={[size, size, segments, segments]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={terrainVert}
        fragmentShader={terrainFrag}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
        wireframe={false}
      />
    </mesh>
  );
}

// ── Holographic Floor Grid ─────────────────────────────────────────────────
const floorVert = `
  varying vec2 vUv;
  varying vec3 vPos;
  void main() {
    vUv = uv;
    vPos = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const floorFrag = `
  uniform float time;
  uniform vec3  color;
  varying vec2  vUv;
  varying vec3  vPos;

  void main() {
    // Infinite grid
    vec2 g = fract(vUv * 20.0);
    float lineX = smoothstep(0.95, 1.0, g.x) + smoothstep(0.0, 0.05, g.x);
    float lineY = smoothstep(0.95, 1.0, g.y) + smoothstep(0.0, 0.05, g.y);
    float grid  = clamp(lineX + lineY, 0.0, 1.0);

    // Center fade
    float fade  = 1.0 - smoothstep(0.0, 0.5, length(vUv - 0.5));

    // Pulse rings from center
    float dist  = length(vPos.xz);
    float pulse = sin(dist * 0.8 - time * 1.5) * 0.5 + 0.5;
    pulse       = pulse * exp(-dist * 0.08) * 0.4;

    float alpha = grid * fade * 0.5 + pulse;
    gl_FragColor = vec4(color, alpha * 0.6);
  }
`;

export function HolographicFloor({ y = -5, size = 30 }: { y?: number; size?: number }) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(() => ({
    time:  { value: 0 },
    color: { value: new THREE.Color("#00e5ff") },
  }), []);

  useFrame((state) => {
    if (!matRef.current) return;
    matRef.current.uniforms.time.value = state.clock.elapsedTime;
  });

  return (
    <mesh position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[size, size, 1, 1]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={floorVert}
        fragmentShader={floorFrag}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

// ── Composite Terrain Layer ────────────────────────────────────────────────
export function TerrainLayer() {
  const quality = getQualityLevel();
  const isHigh  = quality === "high";
  const isMed   = quality !== "low";

  return (
    <>
      <HolographicFloor y={-5.5} size={isHigh ? 40 : 25} />
      {isMed && (
        <CyberTerrain
          size={isHigh ? 30 : 20}
          segments={isHigh ? 64 : 32}
          amplitude={isHigh ? 1.5 : 0.9}
          position={[0, -5.5, 0]}
        />
      )}
    </>
  );
}
